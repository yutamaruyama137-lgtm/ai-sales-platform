import { openai } from './openai.js';
import { logger } from './logger.js';

/**
 * テキストのOpenAI埋め込みベクトルを生成する
 */
export async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.replace(/\n/g, ' ').trim(),
  });
  return response.data[0].embedding;
}

/**
 * 長いテキストをチャンクに分割する
 * @param text - 分割するテキスト
 * @param chunkSize - チャンクサイズ（文字数）
 * @param overlap - オーバーラップ文字数
 */
export function chunkText(text: string, chunkSize = 1500, overlap = 200): string[] {
  const cleaned = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  if (cleaned.length <= chunkSize) {
    return [cleaned];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    let chunk = cleaned.slice(start, end);

    // 文の途中で切れないよう、最後の句読点・改行で区切る
    if (end < cleaned.length) {
      const lastBreak = Math.max(
        chunk.lastIndexOf('。'),
        chunk.lastIndexOf('\n'),
        chunk.lastIndexOf('. '),
        chunk.lastIndexOf('! '),
        chunk.lastIndexOf('? ')
      );
      if (lastBreak > chunkSize * 0.5) {
        chunk = chunk.slice(0, lastBreak + 1);
      }
    }

    chunks.push(chunk.trim());
    start += chunk.length - overlap;
    if (start >= cleaned.length) break;
  }

  logger.info(`Text chunked`, { totalChunks: chunks.length, textLength: cleaned.length });
  return chunks;
}

/**
 * テキストファイルのバイト列を適切な文字コードでデコードする
 * UTF-8を優先し、失敗時に日本語でよく使われる文字コードへフォールバックする
 */
export function decodeTextBuffer(buffer: Buffer): string {
  const encodings = ['utf-8', 'shift_jis', 'euc-jp', 'iso-2022-jp'] as const;

  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding, { fatal: true });
      const decoded = decoder.decode(buffer);
      // 文字化け時に出やすい置換文字が多い結果は避ける
      const replacementCount = (decoded.match(/\uFFFD/g) ?? []).length;
      if (replacementCount <= Math.max(1, Math.floor(decoded.length * 0.01))) {
        return decoded;
      }
    } catch {
      // 次の文字コードで再試行
    }
  }

  logger.warn('Falling back to UTF-8 decode with replacement');
  return buffer.toString('utf-8');
}

/**
 * PDFバッファからテキストを抽出する（pdf-parseが利用可能な場合）
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // dynamic importでpdf-parseを試みる（インストール済みの場合のみ動作）
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const mod = await Function('m', 'return import(m)')('pdf-parse') as any;
    const pdfParse = (mod.default || mod) as (buf: Buffer) => Promise<{ text: string }>;
    /* eslint-enable @typescript-eslint/no-explicit-any */
    const data = await pdfParse(buffer);
    const text = data.text;
    // PDF処理後にGCを促してメモリを解放
    if (typeof global.gc === 'function') global.gc();
    return text;
  } catch {
    logger.warn('pdf-parse not available, treating as plain text');
    return buffer.toString('utf-8');
  }
}
