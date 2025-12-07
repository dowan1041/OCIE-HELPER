"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";

interface Equipment {
  id?: string;
  lin: string[];
  nomenclature: string;
  partialNsn: string;
  anotherName: string;
  size: string;
  image: string | null;
}

type ViewMode = "home" | "search" | "list";

export default function Home() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Equipment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("home");
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>("home");

  // Passcode Modal State
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [passcodeError, setPasscodeError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Add Item Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    lin: "",
    nomenclature: "",
    partialNsn: "",
    anotherName: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const equipment = equipmentList;

  // Load equipment data from API
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const res = await fetch("/api/equipment");
        if (res.ok) {
          const data = await res.json();
          setEquipmentList(data);
        }
      } catch (error) {
        console.error("Failed to load equipment:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEquipment();
  }, []);

  // Filter equipment for list view (real-time filtering)
  const filteredEquipment = useMemo(() => {
    if (!query.trim()) return equipment;

    const searchTerm = query.toLowerCase().trim();
    return equipment.filter((item) => {
      const linMatch = item.lin.some((lin) =>
        lin.toLowerCase().includes(searchTerm)
      );
      const nomenclatureMatch = item.nomenclature
        .toLowerCase()
        .includes(searchTerm);
      const nsnMatch = item.partialNsn.toLowerCase().includes(searchTerm);
      const anotherNameMatch = item.anotherName
        .toLowerCase()
        .includes(searchTerm);

      return linMatch || nomenclatureMatch || nsnMatch || anotherNameMatch;
    });
  }, [query, equipment]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const searchTerm = query.toLowerCase().trim();

    const results = equipment.filter((item) => {
      // Search in LIN (multiple codes)
      const linMatch = item.lin.some((lin) =>
        lin.toLowerCase().includes(searchTerm)
      );
      // Search in NOMENCLATURE
      const nomenclatureMatch = item.nomenclature
        .toLowerCase()
        .includes(searchTerm);
      // Search in Partial NSN
      const nsnMatch = item.partialNsn.toLowerCase().includes(searchTerm);
      // Search in Another Name
      const anotherNameMatch = item.anotherName
        .toLowerCase()
        .includes(searchTerm);

      return linMatch || nomenclatureMatch || nsnMatch || anotherNameMatch;
    });

    setSearchResults(results);
    setPreviousViewMode(viewMode);
    setViewMode("search");
  };

  const handleClear = () => {
    setQuery("");
    setSearchResults([]);
    setViewMode("home");
    setPreviousViewMode("home");
  };

  const handleViewList = () => {
    setPreviousViewMode(viewMode);
    setViewMode("list");
  };

  const handleBack = () => {
    if (previousViewMode === "list") {
      setViewMode("list");
    } else {
      handleClear();
    }
  };

  const handleAddItemClick = () => {
    if (isAuthenticated) {
      setShowAddModal(true);
    } else {
      setShowPasscodeModal(true);
    }
  };

  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setPasscodeError("");

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setShowPasscodeModal(false);
        setShowAddModal(true);
        setPasscode("");
      } else {
        setPasscodeError("Invalid passcode");
      }
    } catch {
      setPasscodeError("Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      // Upload image first if provided
      let imageUrl: string | null = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("nsn", addForm.partialNsn);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          // Use url if available (Firebase Storage), otherwise fallback to filename
          imageUrl = uploadData.url || uploadData.filename;
        }
      }

      // Add equipment item
      const linArray = addForm.lin
        .split(/[/,]/)
        .map((s) => s.trim())
        .filter((s) => s);

      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addForm,
          lin: linArray,
          image: imageUrl,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitMessage("Item added successfully!");
        setEquipmentList([...equipmentList, data.item]);
        setTimeout(() => {
          setShowAddModal(false);
          setAddForm({ lin: "", nomenclature: "", partialNsn: "", anotherName: "" });
          setImageFile(null);
          setSubmitMessage("");
        }, 1500);
      } else {
        setSubmitMessage(data.error || "Failed to add item");
      }
    } catch {
      setSubmitMessage("Error adding item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header - shows when not on home */}
      {viewMode !== "home" && (
        <header className="border-b border-gray-200 py-3 px-4 md:py-4 md:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-8">
            <h1
              className="text-lg md:text-xl font-bold text-gray-800 cursor-pointer hover:opacity-80"
              onClick={handleClear}
            >
              OCIE HELPER
            </h1>
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-full hover:shadow-md focus:shadow-md focus:outline-none text-base"
                  placeholder="Search equipment..."
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${viewMode === "home" ? "flex flex-col items-center justify-center px-4" : "px-4 py-4 md:px-6 md:py-6"}`}>
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-500 mt-4">Loading equipment data...</p>
          </div>
        )}

        {/* Google-style landing page */}
        {!isLoading && viewMode === "home" && (
          <div className="flex flex-col items-center w-full max-w-3xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center mb-6 md:mb-8">
              <span className="text-[#5e5d3c]">O</span>
              <span className="text-[#8b7355]">C</span>
              <span className="text-[#6b5b4f]">I</span>
              <span className="text-[#4a5d3c]">E</span>
              <span className="text-[#3d3c29]"> HELPER</span>
            </h1>
            <p className="text-gray-600 text-base md:text-lg mb-4 md:mb-6">FOR 101ST ESB HHC</p>
            <form onSubmit={handleSearch} className="w-full">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center border border-gray-300 rounded-full px-4 py-3 hover:shadow-md focus-within:shadow-md">
                  <svg
                    className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 outline-none text-base md:text-lg min-w-0"
                    placeholder="Search LIN, NSN, Name..."
                    autoFocus
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="text-gray-400 hover:text-gray-600 cursor-pointer flex-shrink-0"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border border-gray-300 hover:border-gray-400 cursor-pointer whitespace-nowrap"
                >
                  SEARCH
                </button>
              </div>
              <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 mt-4 md:mt-6">
                <button
                  type="button"
                  onClick={handleViewList}
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded cursor-pointer text-sm md:text-base"
                >
                  View All Gear List
                </button>
                <button
                  type="button"
                  onClick={handleAddItemClick}
                  className="px-6 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded cursor-pointer text-sm md:text-base"
                >
                  + Add Item
                </button>
              </div>
            </form>
            <p className="text-xs sm:text-sm text-gray-500 mt-6 md:mt-8 text-center">
              Search for your equipment by LIN, Nomenclature, Partial NSN, or Item Name
            </p>
          </div>
        )}

        {/* Search Results */}
        {!isLoading && viewMode === "search" && (
          <div className="max-w-6xl w-full mx-auto">
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 md:gap-2 text-gray-600 hover:text-gray-800 transition-colors cursor-pointer text-sm md:text-base"
              >
                <svg
                  className="w-4 h-4 md:w-5 md:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                {previousViewMode === "list" ? "Back to List" : "Back"}
              </button>
              <span className="text-gray-300 hidden sm:inline">|</span>
              <p className="text-xs md:text-sm text-gray-500 w-full sm:w-auto">
                {searchResults.length} results for &ldquo;{query}&rdquo;
              </p>
            </div>

            {searchResults.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <p className="text-gray-500 text-base md:text-lg">No equipment found matching your search.</p>
                <p className="text-gray-400 mt-2 text-sm md:text-base">Try searching with different keywords.</p>
              </div>
            ) : (
              <div className={`grid gap-4 md:gap-6 ${
                searchResults.length === 1
                  ? "grid-cols-1 max-w-md mx-auto"
                  : searchResults.length === 2
                    ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}>
                {searchResults.map((item, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white"
                  >
                    {/* Image */}
                    <div className={`relative bg-gray-100 ${searchResults.length === 1 ? "h-64" : "h-48"}`}>
                      {item.image ? (
                        <Image
                          src={item.image.startsWith("http") ? item.image : `/images/${item.image}`}
                          alt={item.nomenclature}
                          fill
                          className="object-contain p-4"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <svg
                            className="w-16 h-16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h2 className="font-bold text-lg text-gray-800 mb-1">
                        {item.nomenclature}
                      </h2>
                      {item.anotherName && (
                        <p className="text-blue-600 text-sm mb-2">
                          {item.anotherName}
                        </p>
                      )}
                      <p className="text-gray-600 text-sm">
                        <span className="font-medium">Partial NSN:</span> {item.partialNsn}
                      </p>
                      <p className="text-gray-500 text-sm">
                        <span className="font-medium">LIN:</span> {item.lin.join(" / ")}
                      </p>
                      {item.size && (
                        <p className="text-gray-500 text-sm">
                          <span className="font-medium">Size:</span> {item.size}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* List View */}
        {!isLoading && viewMode === "list" && (
          <div className="w-full max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">All Gear List</h2>
              <span className="text-xs md:text-sm text-gray-500">
                {query ? `${filteredEquipment.length} / ${equipment.length}` : `${equipment.length}`} items
              </span>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {filteredEquipment.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  No items found matching &ldquo;{query}&rdquo;
                </div>
              ) : (
                filteredEquipment.map((item, index) => (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer active:bg-blue-50"
                    onClick={() => {
                      setQuery(item.nomenclature);
                      setSearchResults([item]);
                      setPreviousViewMode("list");
                      setViewMode("search");
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-gray-400 font-mono">#{index + 1}</span>
                      <span className="text-sm text-blue-600 font-mono">{item.partialNsn}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 mb-1">{item.nomenclature}</h3>
                    <p className="text-xs text-gray-500 font-mono">{item.lin.join(" / ")}</p>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">LIN</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nomenclature</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-24">NSN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEquipment.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No items found matching &ldquo;{query}&rdquo;
                      </td>
                    </tr>
                  ) : (
                    filteredEquipment.map((item, index) => (
                      <tr
                        key={index}
                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => {
                          setQuery(item.nomenclature);
                          setSearchResults([item]);
                          setPreviousViewMode("list");
                          setViewMode("search");
                        }}
                      >
                        <td className="px-4 py-3 text-sm text-gray-400 font-mono">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">{item.lin.join(" / ")}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{item.nomenclature}</td>
                        <td className="px-4 py-3 text-sm text-blue-600 font-mono">{item.partialNsn}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-3 md:py-4 text-center text-xs md:text-sm text-gray-500 px-4">
        OCIE Helper for 101st ESB HHC
      </footer>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold text-gray-800">Add New Item</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSubmitMessage("");
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddItem} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomenclature <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.nomenclature}
                  onChange={(e) => setAddForm({ ...addForm, nomenclature: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., BAG,DUFFEL"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partial NSN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  pattern="\d{4}"
                  maxLength={4}
                  value={addForm.partialNsn}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setAddForm({ ...addForm, partialNsn: value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1234"
                />
                <p className="text-xs text-gray-500 mt-1">Must be exactly 4 digits</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LIN <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(separate with / or ,)</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.lin}
                  onChange={(e) => setAddForm({ ...addForm, lin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., DA150J / B14729"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Name (Another Name)
                </label>
                <input
                  type="text"
                  value={addForm.anotherName}
                  onChange={(e) => setAddForm({ ...addForm, anotherName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Medium Rucksack"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Image will be saved as [NSN].[ext] (e.g., 1234.jpg)
                </p>
              </div>

              {submitMessage && (
                <div className={`p-3 rounded-md text-sm ${
                  submitMessage.includes("success")
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                }`}>
                  {submitMessage}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSubmitMessage("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Admin Access</h2>
              <button
                onClick={() => {
                  setShowPasscodeModal(false);
                  setPasscode("");
                  setPasscodeError("");
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePasscodeSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter Passcode
                </label>
                <input
                  type="password"
                  required
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Passcode"
                  autoFocus
                />
              </div>

              {passcodeError && (
                <div className="p-3 rounded-md text-sm bg-red-50 text-red-700">
                  {passcodeError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasscodeModal(false);
                    setPasscode("");
                    setPasscodeError("");
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isVerifying ? "Verifying..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
