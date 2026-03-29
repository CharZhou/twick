const FileInput = ({
  acceptFileTypes,
  onFileLoad,
  buttonText,
  id,
}: {
  acceptFileTypes: string[];
  onFileLoad: (content: any) => void | Promise<void>;
  buttonText: string;
  id: string;
  className?: string;
  icon?: React.ReactNode;
}) => {
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      Promise.resolve(
        onFileLoad({
          content: undefined,
          type: file.type,
          name: file.name,
          file,
          blobUrl: URL.createObjectURL(file),
        }),
      )
        .catch((error) => {
          console.error("Error parsing file:", error);
        })
        .finally(() => {
          e.target.value = "";
        });
    }
  };

  return (
    <label
      htmlFor={id}
      className="file-input-container"
      style={{ alignItems: "center", cursor: "pointer" }}
    >
      <input
        type="file"
        accept={acceptFileTypes.join(",")}
        className="input w-full"
        id={id}
        onChange={onFileChange}
      />
      <span className="text-sm opacity-80" style={{ marginLeft: "0.5rem" }}>
        {buttonText ?? "Upload"}
      </span>
    </label>
  );
};

export default FileInput;
