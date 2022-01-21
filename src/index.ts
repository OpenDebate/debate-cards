import generateFile from 'app/actions/generateFile';
import { db } from 'app/lib';
import { writeFile } from 'fs/promises';
(async () => {
  try {
    const ids = (
      await db.evidence.findMany({
        where: { fileId: 1 },
      })
    ).map((card) => card.id);
    const file = await generateFile(ids, true);
    await writeFile('./test.docx', file);
  } catch (error) {
    console.error(error);
  }
})();
