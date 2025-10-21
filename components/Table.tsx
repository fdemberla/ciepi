"use client";
import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { Icon } from "@iconify/react";

interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  title?: string;
  emptyMessage?: string;
  emptyIcon?: string;
  className?: string;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enablePagination?: boolean;
  pageSize?: number;
}

export default function Table<T>({
  data,
  columns,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  title,
  emptyMessage = "No se encontraron resultados",
  emptyIcon = "solar:database-linear",
  className = "",
  enableSorting = true,
  enableFiltering = true,
  enablePagination = true,
  pageSize = 10,
}: TableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    onSortingChange: enableSorting ? setSorting : undefined,
    onColumnFiltersChange: enableFiltering ? setColumnFilters : undefined,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? columnFilters : undefined,
    },
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  React.useEffect(() => {
    if (enableFiltering && searchValue !== undefined) {
      table.setGlobalFilter(searchValue);
    }
  }, [searchValue, table, enableFiltering]);

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
    >
      {/* Header con título y búsqueda */}
      {(title || onSearchChange) && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {title && (
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                {title}
              </h2>
            )}
            {onSearchChange && (
              <div className="relative w-full sm:w-auto sm:min-w-[300px]">
                <Icon
                  icon="solar:magnifer-linear"
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark_grey dark:text-gray-400 w-5 h-5"
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-midnight_text dark:text-white"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabla */}
      {data.length === 0 ? (
        <div className="p-12 text-center">
          <Icon
            icon={emptyIcon}
            className="w-16 h-16 text-dark_grey dark:text-gray-500 mx-auto mb-4"
          />
          <p className="text-dark_grey dark:text-gray-400 text-lg">
            {emptyMessage}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full relative">
              <thead className="bg-slateGray dark:bg-gray-700">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="text-left py-4 px-6 font-semibold text-midnight_text dark:text-white"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            className={`flex items-center gap-2 ${
                              header.column.getCanSort()
                                ? "cursor-pointer select-none hover:text-primary transition-colors"
                                : ""
                            }`}
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {enableSorting && header.column.getCanSort() && (
                              <Icon
                                icon={
                                  header.column.getIsSorted() === "asc"
                                    ? "solar:sort-vertical-linear"
                                    : header.column.getIsSorted() === "desc"
                                    ? "solar:sort-vertical-linear"
                                    : "solar:sort-linear"
                                }
                                className={`w-4 h-4 transition-transform ${
                                  header.column.getIsSorted() === "desc"
                                    ? "rotate-180"
                                    : ""
                                }`}
                              />
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slateGray dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-4 px-6 relative">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {enablePagination && table.getPageCount() > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-dark_grey dark:text-gray-400">
                    Mostrando{" "}
                    <span className="font-medium text-midnight_text dark:text-white">
                      {table.getState().pagination.pageIndex *
                        table.getState().pagination.pageSize +
                        1}
                    </span>{" "}
                    a{" "}
                    <span className="font-medium text-midnight_text dark:text-white">
                      {Math.min(
                        (table.getState().pagination.pageIndex + 1) *
                          table.getState().pagination.pageSize,
                        table.getFilteredRowModel().rows.length
                      )}
                    </span>{" "}
                    de{" "}
                    <span className="font-medium text-midnight_text dark:text-white">
                      {table.getFilteredRowModel().rows.length}
                    </span>{" "}
                    resultados
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:bg-slateGray dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icon
                      icon="solar:double-alt-arrow-left-linear"
                      className="w-4 h-4"
                    />
                  </button>
                  <button
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:bg-slateGray dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icon
                      icon="solar:alt-arrow-left-linear"
                      className="w-4 h-4"
                    />
                  </button>

                  <span className="flex items-center gap-1 px-3 py-2 text-sm text-midnight_text dark:text-white">
                    Página{" "}
                    <strong>
                      {table.getState().pagination.pageIndex + 1} de{" "}
                      {table.getPageCount()}
                    </strong>
                  </span>

                  <button
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:bg-slateGray dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icon
                      icon="solar:alt-arrow-right-linear"
                      className="w-4 h-4"
                    />
                  </button>
                  <button
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className="p-2 rounded-lg border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:bg-slateGray dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Icon
                      icon="solar:double-alt-arrow-right-linear"
                      className="w-4 h-4"
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
