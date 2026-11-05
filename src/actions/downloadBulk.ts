import { caselistApi } from 'app/lib/caselist';
import { access, mkdir, writeFile } from 'fs/promises';
import { execSync } from 'child_process';
import request from 'request';

export type BulkDownload = { name: string; url: string };

function downloadUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    request({ url, encoding: null }, (error, response, body) => {
      if (error) return reject(error);
      if (response.statusCode < 200 || response.statusCode > 299) {
        return reject(new Error(`HTTP ${response.statusCode} downloading ${url}`));
      }
      resolve(body);
    });
  });
}

/**
 * Check for a bulk "all" download for a caselist, download and extract it.
 * Returns true if a bulk download was found and extracted, false otherwise.
 * Individual file downloads (downloadFile) check for local file existence,
 * so files placed by bulk extraction will not be re-downloaded.
 */
const DOCUMENT_DIR = process.env.DOCUMENT_PATH || './documents';

export async function downloadBulkIfAvailable(caselistName: string): Promise<boolean> {
  try {
    const { body: downloads } = await caselistApi.getBulkDownloads(caselistName);
    if (!Array.isArray(downloads)) return false;
    const allDownload = downloads.find((d) => d.name?.toLowerCase().includes('all'));
    if (!allDownload?.url) return false;

    const bulkDir = `${DOCUMENT_DIR}/_bulk`;
    const zipPath = `${bulkDir}/${caselistName}_all.zip`;

    // Skip if already downloaded and extracted
    try {
      await access(zipPath);
      console.log(`Bulk download already exists: ${zipPath}`);
      return true;
    } catch {
      // not found, proceed
    }

    await mkdir(bulkDir, { recursive: true });

    // Download the zip — direct URL, not through the rate-limited caselist API
    console.log(`Downloading bulk archive for ${caselistName}: ${allDownload.url}`);
    const buffer = await downloadUrl(allDownload.url);
    await writeFile(zipPath, buffer);

    // Extract into ./documents/ so paths match what downloadFile expects
    // (e.g., round.opensource = "hspolicy24/School/Team/file.docx" → ./documents/hspolicy24/...)
    try {
      execSync(`unzip -o -q "${zipPath}" -d "${DOCUMENT_DIR}"`, { timeout: 120_000 });
      console.log(`Bulk download extracted to ${DOCUMENT_DIR}/ (${buffer.length} bytes)`);
    } catch (err) {
      console.error(`Failed to extract bulk download: ${err.message}`);
      return false;
    }

    return true;
  } catch (err) {
    // getBulkDownloads may 404 or return empty — not all caselists have them
    console.log(`No bulk download available for ${caselistName}: ${err.message || err}`);
    return false;
  }
}
