import { Search } from "lucide-react";
import { useTwickI18n } from "@twick/video-editor";

const SearchInput = ({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) => {
  const { t } = useTwickI18n();
  return (
    <div className="search-container">
      <input
        type="text"
        placeholder={t("common.searchMedia")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input search-input w-full"
      />
      <Search className="search-icon" />
    </div>
  );
};

export default SearchInput;
