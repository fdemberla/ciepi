import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

/**
 * Save a file to the public directory
 * @param file - File object with buffer
 * @param folder - Subfolder within public (e.g., 'banners', 'attachments')
 * @returns Relative path to the saved file
 */
export async function saveFile(
  file: File,
  folder: "banners" | "attachments"
): Promise<string> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${sanitizedName}`;

    // Create directory path
    const uploadDir = path.join(process.cwd(), "public", folder);
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Return relative path for database storage
    return `/${folder}/${filename}`;
  } catch (error) {
    console.error(`Error saving file to ${folder}:`, error);
    throw new Error(`Failed to save file: ${error}`);
  }
}

/**
 * Save multiple files to the public directory
 * @param files - Array of File objects
 * @param folder - Subfolder within public
 * @returns Array of relative paths
 */
export async function saveFiles(
  files: File[],
  folder: "banners" | "attachments"
): Promise<string[]> {
  const savedPaths: string[] = [];

  for (const file of files) {
    const filePath = await saveFile(file, folder);
    savedPaths.push(filePath);
  }

  return savedPaths;
}
