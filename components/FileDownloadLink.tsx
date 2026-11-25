import { Icon } from "@iconify/react";
import { buildSafeFileUrl } from "@/lib/security";

interface FileDownloadProps {
  filePath: string | null | undefined;
  basePath: string | undefined;
  fileName: string;
  icon?: string;
}

export function FileDownloadLink({
  filePath,
  basePath,
  fileName,
  icon = "solar:download-linear",
}: FileDownloadProps) {
  const safeUrl = buildSafeFileUrl(basePath, filePath);

  if (!safeUrl || safeUrl.length === 0) {
    return null;
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-8 py-4 bg-slateGray dark:bg-gray-700 text-midnight_text dark:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl group"
    >
      <Icon
        icon={icon}
        className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform"
      />
      {fileName}
    </a>
  );
}
