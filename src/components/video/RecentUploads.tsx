interface UploadItem {
  id: string;
  name: string;
  status: string;
}

const mockUploads: UploadItem[] = [
  { id: "1", name: "net-session-1.mp4", status: "COMPLETE" },
  { id: "2", name: "cover-drive-drill.mp4", status: "PROCESSING" },
];

export default function RecentUploads() {
  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="mb-2 text-sm font-semibold">Recent uploads</h3>
      <ul className="space-y-2 text-sm">
        {mockUploads.map((upload) => (
          <li key={upload.id} className="flex items-center justify-between">
            <span>{upload.name}</span>
            <span>{upload.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
