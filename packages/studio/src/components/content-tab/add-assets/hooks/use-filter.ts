import { useState } from "react";

const useFilter = (initialFilters = []) => {
    //
    const [filters, setFilters] = useState(["all", ...initialFilters]);
    const [searchQuery, setSearchQuery] = useState("");

    const handleChangeFilter = (val) => {
        if (!filters) return;

        let newArray = [];

        if (filters.includes(val)) {
            newArray = filters.filter((text) => text !== val);
        } else {
            newArray = val === "all" ? ["all"] : [...filters, val];

            const arrayWithoutAll = newArray.filter((el) => el !== "all");

            if (newArray.includes("all") && arrayWithoutAll.length > 0) {
                newArray = arrayWithoutAll;
            }
        }

        if (newArray.length === 0) {
            newArray = ["all"];
        }

        setFilters(newArray);
    };

    return { filters, searchQuery, handleChangeFilter, setSearchQuery };
};

export default useFilter;
