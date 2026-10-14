export interface TransactionItem {
  id?: string;
  rowIndex?: number; // 0-indexed in sheet rows
  date: string;
  description: string;
  category: string;
  type: 'Despesa' | 'Receita';
  amount: number;
  payment_method: string;
  notes: string;
}

export interface SpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: Array<{ sheetId: number; title: string }>;
}

/**
 * List spreadsheets accessible via Google Drive
 */
export async function listUserSpreadsheets(accessToken: string): Promise<SpreadsheetFile[]> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=25",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Drive list warning:', err);
      return [];
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('Erro ao listar planilhas:', error);
    return [];
  }
}

/**
 * Get spreadsheet metadata (title and sheet tabs)
 */
export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string): Promise<SheetMetadata> {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties(sheetId,title)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao acessar os detalhes da planilha no Google Sheets.');
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Planilha Sem Nome',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId || 0,
      title: s.properties?.title || 'Lançamentos',
    })),
  };
}

/**
 * Creates a brand new ready-to-use financial spreadsheet
 */
export async function createFinancialSpreadsheet(accessToken: string, customTitle?: string): Promise<{ id: string; name: string; url: string }> {
  const title = customTitle?.trim() || 'FinanIA - Controle Financeiro';

  const body = {
    properties: {
      title,
    },
    sheets: [
      {
        properties: {
          title: 'Lançamentos',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'Data' } },
                  { userEnteredValue: { stringValue: 'Descrição' } },
                  { userEnteredValue: { stringValue: 'Categoria' } },
                  { userEnteredValue: { stringValue: 'Tipo' } },
                  { userEnteredValue: { stringValue: 'Valor (R$)' } },
                  { userEnteredValue: { stringValue: 'Forma de Pagamento' } },
                  { userEnteredValue: { stringValue: 'Observações' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Não foi possível criar a planilha no Google Sheets.');
  }

  const data = await res.json();
  const id = data.spreadsheetId;
  const url = `https://docs.google.com/spreadsheets/d/${id}/edit`;

  return { id, name: title, url };
}

/**
 * Reads all rows from spreadsheet and converts to TransactionItem list
 */
export async function readTransactionsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string = 'Lançamentos'
): Promise<TransactionItem[]> {
  const encodedTitle = encodeURIComponent(sheetTitle);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodedTitle}'!A:G`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    // If the sheet title wasn't found, try to fetch the first tab name
    const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
    if (details.sheets.length > 0 && details.sheets[0].title !== sheetTitle) {
      return readTransactionsFromSheet(accessToken, spreadsheetId, details.sheets[0].title);
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao ler dados da planilha.');
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length <= 1) {
    return [];
  }

  const transactions: TransactionItem[] = [];

  // Row 0 is header: Data, Descrição, Categoria, Tipo, Valor (R$), Forma de Pagamento, Observações
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const rawDate = String(row[0] || '').trim();
    const rawDesc = String(row[1] || '').trim();
    const rawCat = String(row[2] || 'Outros').trim();
    const rawType = String(row[3] || 'Despesa').trim();
    
    // Parse amount from string or number
    let rawAmount = row[4];
    let amount = 0;
    if (typeof rawAmount === 'number') {
      amount = rawAmount;
    } else if (typeof rawAmount === 'string') {
      // remove 'R$', spaces, replace brazilian comma with dot
      const clean = rawAmount.replace(/R\$/gi, '').trim().replace(/\./g, '').replace(',', '.');
      amount = parseFloat(clean) || 0;
    }

    const rawPayment = String(row[5] || 'Não especificado').trim();
    const rawNotes = String(row[6] || '').trim();

    transactions.push({
      id: `row-${i}`,
      rowIndex: i,
      date: rawDate,
      description: rawDesc,
      category: rawCat,
      type: rawType.toLowerCase().includes('rec') ? 'Receita' : 'Despesa',
      amount: Math.abs(amount),
      payment_method: rawPayment,
      notes: rawNotes,
    });
  }

  // Sort by date descending
  return transactions.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : (b.rowIndex || 0) - (a.rowIndex || 0)));
}

/**
 * Appends transactions to the specified sheet
 */
export async function appendTransactionsToSheet(
  accessToken: string,
  spreadsheetId: string,
  transactions: TransactionItem[],
  sheetTitle: string = 'Lançamentos'
): Promise<void> {
  if (transactions.length === 0) return;

  const encodedTitle = encodeURIComponent(sheetTitle);
  const rows = transactions.map(t => [
    t.date,
    t.description,
    t.category,
    t.type,
    t.amount,
    t.payment_method,
    t.notes || '',
  ]);

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodedTitle}'!A:G:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rows }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao salvar lançamentos na planilha.');
  }
}

/**
 * Deletes a row by its index using batchUpdate
 */
export async function deleteTransactionFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number
): Promise<void> {
  const body = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      },
    ],
  };

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Falha ao excluir linha da planilha.');
  }
}
