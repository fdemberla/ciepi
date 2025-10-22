"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import { Descendant } from "slate";
import SlateEditorField from "@/components/SlateEditorField";
import type { FormFieldConfig } from "@/components/Form.types";

// Componente de palabras clave
interface KeywordsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
}

function KeywordsInput({ value, onChange }: KeywordsInputProps) {
  const [keywordInput, setKeywordInput] = useState("");
  const keywords = value || [];

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      onChange([...keywords, trimmed]);
      setKeywordInput("");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={keywordInput}
          onChange={(e) => setKeywordInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddKeyword();
            }
          }}
          placeholder="Escribe una palabra y presiona Enter"
          className="flex-1 rounded-md border border-black/20 dark:border-gray-600 border-solid bg-white dark:bg-gray-700 px-5 py-3 text-base text-midnight_text dark:text-white outline-none transition placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:border-[#1A21BC] dark:focus:border-[#1A21BC] focus-visible:shadow-none"
        />
        <button
          type="button"
          onClick={handleAddKeyword}
          className="px-4 py-3 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors font-medium"
        >
          Agregar
        </button>
      </div>
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {keywords.map((keyword, index) => (
            <div
              key={index}
              className="bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-full px-4 py-2 flex items-center gap-2 text-midnight_text dark:text-white"
            >
              <span>{keyword}</span>
              <button
                type="button"
                onClick={() => {
                  const newKeywords = keywords.filter((_, i) => i !== index);
                  onChange(newKeywords);
                }}
                className="text-primary hover:text-primary/80 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {keywords.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No hay palabras clave agregadas
        </p>
      )}
    </div>
  );
}

// Componente de formulario personalizado para blog
interface BlogFormProps {
  fields: FormFieldConfig[];
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  submitLabel: string;
  isSubmitting: boolean;
  initialValues: Record<string, unknown>;
}

function BlogForm({
  fields,
  onSubmit,
  submitLabel,
  isSubmitting,
  initialValues,
}: BlogFormProps) {
  const [formData, setFormData] =
    useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateField = (field: FormFieldConfig, value: unknown) => {
    if (
      field.required &&
      (value === undefined ||
        value === null ||
        value === "" ||
        (Array.isArray(value) && value.length === 0))
    ) {
      return field.errorMessage || "Este campo es obligatorio.";
    }
    if (typeof field.regex === "string" && typeof value === "string") {
      const regex = new RegExp(field.regex);
      if (!regex.test(value)) {
        return field.errorMessage || "Formato inválido.";
      }
    }
    return "";
  };

  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (name: string, files: FileList | null) => {
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      setFormData((prev) => ({ ...prev, [name]: fileArray }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: null }));
    }
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        valid = false;
        newErrors[field.name] = error;
      }
    });

    setErrors(newErrors);
    if (!valid) return;

    await onSubmit(formData);
  };

  const renderField = (field: FormFieldConfig) => {
    switch (field.type) {
      case "text":
        return (
          <input
            id={field.name}
            name={field.name}
            type="text"
            className="w-full rounded-md border border-black/20 dark:border-gray-600 border-solid bg-white dark:bg-gray-700 px-5 py-3 text-base text-midnight_text dark:text-white outline-none transition placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:border-[#1A21BC] dark:focus:border-[#1A21BC] focus-visible:shadow-none disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
            value={(formData[field.name] as string) || ""}
            onChange={(e) => handleChange(field.name, e.target.value)}
            required={field.required}
          />
        );

      case "keywords":
        return (
          <KeywordsInput
            value={(formData[field.name] as string[]) || []}
            onChange={(val) => handleChange(field.name, val)}
          />
        );

      case "file":
        return (
          <div
            className="w-full flex flex-col items-center justify-center border-2 border-dashed border-black/20 dark:border-gray-600 rounded-md py-12 px-4 bg-white dark:bg-gray-800 text-dark_grey dark:text-gray-300 cursor-pointer transition-all hover:border-[#1A21BC] hover:bg-primary/5 dark:hover:bg-primary/10 focus:outline-none focus:border-[#1A21BC] min-h-[160px]"
            onClick={() =>
              document.getElementById(`file-input-${field.name}`)?.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFileChange(field.name, e.dataTransfer.files);
            }}
            tabIndex={0}
            role="button"
            aria-label="Subir archivos"
          >
            <input
              id={`file-input-${field.name}`}
              name={field.name}
              type="file"
              className="hidden"
              onChange={(e) => handleFileChange(field.name, e.target.files)}
              accept={field.accept}
            />
            <div className="flex flex-col items-center pointer-events-none select-none text-center">
              <svg
                className="w-12 h-12 mb-4 text-dark_grey dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0l-4 4m4-4l4 4M20.25 16.5v2.25A2.25 2.25 0 0118 21H6a2.25 2.25 0 01-2.25-2.25V16.5"
                />
              </svg>
              <span className="text-base px-2 text-midnight_text dark:text-white mb-2">
                {field.dropzoneText ||
                  "Arrastra y suelta archivos aquí o toca para seleccionar"}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                PNG, JPG, GIF hasta 5MB
              </span>
            </div>
            {formData[field.name] &&
            Array.isArray(formData[field.name]) &&
            (formData[field.name] as File[]).length > 0 ? (
              <div className="mt-3 text-sm text-midnight_text dark:text-white w-full text-center px-2">
                {(formData[field.name] as File[])
                  .map((file: File) => file.name)
                  .join(", ")}
              </div>
            ) : null}
          </div>
        );

      case "textarea-slate":
        return (
          <div className="border border-black/20 dark:border-gray-600 rounded-md overflow-hidden min-h-[500px]">
            <SlateEditorField
              id={field.name}
              name={field.name}
              value={(formData[field.name] as Descendant[]) || undefined}
              onChange={(val) => handleChange(field.name, val)}
              required={field.required}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {fields.map((field) => (
        <div key={field.name} className="w-full">
          <label
            htmlFor={field.name}
            className="block mb-3 text-lg font-medium text-midnight_text dark:text-white"
          >
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(field)}
          {errors[field.name] && (
            <span className="text-red-500 text-sm mt-2 block">
              {errors[field.name]}
            </span>
          )}
        </div>
      ))}

      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex items-center text-lg font-medium justify-center rounded-md px-6 py-4 text-white transition duration-300 ease-in-out border-[#1A21BC] border ${
            isSubmitting
              ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70"
              : "bg-primary hover:bg-primary/90"
          }`}
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Procesando...
            </>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
}

interface Blog {
  id?: string;
  titulo: string;
  imagen_banner: string | null;
  palabras_clave: string[];
  contenido: unknown;
  estado?: number;
  estado_nombre?: string;
}

interface BlogEditorProps {
  mode: "create" | "edit";
  blog?: Blog;
  onCancel: () => void;
}

export default function BlogEditor({ mode, blog, onCancel }: BlogEditorProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"borrador" | "revision">(
    "borrador"
  );
  const [isChangingState, setIsChangingState] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [localBlog, setLocalBlog] = useState<Blog | undefined>(blog);
  const [selectedEstadoId, setSelectedEstadoId] = useState<number | null>(
    localBlog?.estado ?? null
  );
  const [comentarioEstado, setComentarioEstado] = useState("");

  // Definir los campos del formulario con layout completo
  const formFields: FormFieldConfig[] = [
    {
      name: "titulo",
      label: "Título del Blog",
      type: "text",
      required: true,
      errorMessage: "El título es requerido",
    },
    {
      name: "imagen_banner",
      label: "Imagen Banner",
      type: "file",
      required: false,
      accept: "image/*",
      dropzoneText:
        "Arrastra y suelta una imagen aquí o haz clic para seleccionar",
    },
    {
      name: "palabras_clave",
      label: "Palabras Clave (opcional)",
      type: "keywords",
      required: false,
    },
    {
      name: "contenido",
      label: "Contenido del Blog",
      type: "textarea-slate",
      required: true,
      errorMessage: "El contenido es requerido",
    },
  ];

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("directory", "blogs");

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const response = await fetch(`${basePath}/api/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error al subir imagen");
    }

    const data = await response.json();
    return data.url;
  };

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);

      // Palabras clave ya vienen como array
      const palabrasClaveArray = (data.palabras_clave as string[]) || [];

      // Manejar imagen banner
      let imagenBannerUrl = blog?.imagen_banner || null;
      if (
        data.imagen_banner &&
        Array.isArray(data.imagen_banner) &&
        data.imagen_banner.length > 0
      ) {
        const file = data.imagen_banner[0] as File;
        imagenBannerUrl = await uploadImage(file);
      }

      let requestData: Record<string, unknown>;
      let url: string;
      let method: string;

      if (mode === "create") {
        // Determinar estado inicial para creación
        const estado = selectedAction === "borrador" ? 1 : 2;

        requestData = {
          titulo: data.titulo,
          imagen_banner: imagenBannerUrl,
          palabras_clave: palabrasClaveArray,
          contenido: data.contenido,
          estado,
        };

        url = "/api/admin/blog";
        method = "POST";
      } else {
        // Para edición
        requestData = {
          titulo: data.titulo,
          imagen_banner: imagenBannerUrl,
          palabras_clave: palabrasClaveArray,
          contenido: data.contenido,
        };

        url = `/api/admin/blog/${blog?.id}`;
        method = "PUT";
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}${url}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Error al ${mode === "create" ? "crear" : "actualizar"} el blog`
        );
      }

      if (mode === "create") {
        if (selectedAction === "borrador") {
          toast.success("Blog guardado como borrador exitosamente");
        } else {
          toast.success("Blog enviado a revisión exitosamente");
        }
      } else {
        toast.success("Blog actualizado exitosamente");
      }

      router.push("/admin/blog");
    } catch (error) {
      console.error(
        `Error al ${mode === "create" ? "crear" : "actualizar"} blog:`,
        error
      );
      toast.error(
        error instanceof Error
          ? error.message
          : `Error al ${mode === "create" ? "crear" : "actualizar"} el blog`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstadoBadge = (estado: number, estadoNombre: string) => {
    const badges = {
      1: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", // Borrador
      2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", // En Revisión CIEPI
      3: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", // Rechazado por CIEPI
      4: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", // En Revisión RR.PP
      5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", // Rechazado por RR.PP
      6: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", // Publicado
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-semibold ${
          badges[estado as keyof typeof badges]
        }`}
      >
        {estadoNombre}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {" "}
        {/* Aumenté el ancho máximo */}
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:arrow-left-linear"
                className="w-6 h-6 text-midnight_text dark:text-white"
              />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white">
                {mode === "create"
                  ? "Crear Nueva Entrada de Blog"
                  : "Editar Blog"}
              </h1>
              <p className="text-dark_grey dark:text-gray-400">
                {mode === "create"
                  ? "Crea una nueva entrada para el blog con contenido enriquecido"
                  : "Modifica la información y contenido del blog"}
              </p>
            </div>
            {mode === "edit" && localBlog && (
              <div className="flex items-center gap-3">
                {getEstadoBadge(localBlog.estado!, localBlog.estado_nombre!)}
                <button
                  onClick={() => {
                    setSelectedEstadoId(localBlog.estado ?? null);
                    setComentarioEstado("");
                    setShowStateModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  <Icon icon="solar:check-circle-linear" className="w-4 h-4" />
                  Cambiar Estado
                </button>
              </div>
            )}
          </div>

          {/* Modal para cambiar estado (rendereado fuera del flex pero dentro del header) */}
          {showStateModal && localBlog && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-auto">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-midnight_text dark:text-white">
                      Cambiar estado del blog
                    </h3>
                    <button
                      onClick={() => setShowStateModal(false)}
                      className="text-dark_grey dark:text-gray-400 hover:text-midnight_text dark:hover:text-white transition-colors"
                    >
                      <Icon
                        icon="solar:close-circle-linear"
                        className="w-6 h-6"
                      />
                    </button>
                  </div>
                  <p className="text-sm text-dark_grey dark:text-gray-400 mt-2">
                    Estado actual:{" "}
                    <span className="font-medium">
                      {localBlog.estado_nombre}
                    </span>
                  </p>
                </div>

                <div className="p-6">
                  <div className="space-y-3">
                    {/* Lista de estados disponibles */}
                    {[
                      {
                        id: 1,
                        nombre: "Borrador",
                        descripcion: "Borrador - editable por el autor",
                      },
                      {
                        id: 2,
                        nombre: "En Revisión CIEPI",
                        descripcion: "En revisión por CIEPI",
                      },
                      {
                        id: 3,
                        nombre: "Rechazado por CIEPI",
                        descripcion: "Rechazado por CIEPI",
                      },
                      {
                        id: 4,
                        nombre: "En Revisión Relaciones Públicas",
                        descripcion: "En revisión por Relaciones Públicas",
                      },
                      {
                        id: 5,
                        nombre: "Rechazado por Relaciones Públicas",
                        descripcion: "Rechazado por Relaciones Públicas",
                      },
                      {
                        id: 6,
                        nombre: "Publicado",
                        descripcion: "Publicado públicamente",
                      },
                    ].map((estado) => (
                      <label
                        key={estado.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedEstadoId === estado.id
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="estado"
                          value={estado.id}
                          checked={selectedEstadoId === estado.id}
                          onChange={() => setSelectedEstadoId(estado.id)}
                          className="mt-1 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-midnight_text dark:text-white">
                              {estado.nombre}
                            </span>
                          </div>
                          <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">
                            {estado.descripcion}
                          </p>
                        </div>
                      </label>
                    ))}

                    <div>
                      <label className="block text-sm font-medium text-midnight_text dark:text-white mb-2">
                        Comentario (opcional)
                      </label>
                      <textarea
                        value={comentarioEstado}
                        onChange={(e) => setComentarioEstado(e.target.value)}
                        placeholder="Agregar comentario sobre este cambio..."
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white resize-none"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setShowStateModal(false)}
                      disabled={isChangingState}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-midnight_text dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={async () => {
                        if (!localBlog || selectedEstadoId === null) return;
                        if (selectedEstadoId === localBlog.estado) {
                          setShowStateModal(false);
                          return;
                        }

                        try {
                          setIsChangingState(true);
                          const basePath =
                            process.env.NEXT_PUBLIC_BASE_PATH || "";
                          const res = await fetch(
                            `${basePath}/api/admin/blog/${localBlog.id}`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                estado: selectedEstadoId,
                                comentario_temp: comentarioEstado,
                              }),
                            }
                          );

                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(
                              err.error || "Error al cambiar estado"
                            );
                          }

                          const result = await res.json();
                          // Actualizar estado localmente
                          setLocalBlog((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  estado: selectedEstadoId!,
                                  estado_nombre:
                                    result.data?.estado_nombre ??
                                    prev.estado_nombre,
                                }
                              : prev
                          );
                          toast.success("Estado actualizado correctamente");
                          setShowStateModal(false);
                        } catch (error) {
                          console.error("Error cambiando estado:", error);
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Error al cambiar estado"
                          );
                        } finally {
                          setIsChangingState(false);
                        }
                      }}
                      disabled={
                        isChangingState ||
                        selectedEstadoId === localBlog?.estado
                      }
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      {isChangingState ? "Procesando..." : "Confirmar cambio"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Selector de Acción para creación */}
        {mode === "create" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-midnight_text dark:text-white mb-4">
              ¿Qué deseas hacer con este blog?
            </h3>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="borrador"
                  checked={selectedAction === "borrador"}
                  onChange={(e) =>
                    setSelectedAction(e.target.value as "borrador" | "revision")
                  }
                  className="mr-3 w-4 h-4 text-primary"
                />
                <div>
                  <span className="text-base font-medium text-midnight_text dark:text-white">
                    Guardar como borrador
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    El blog se guardará como borrador y podrás editarlo más
                    tarde
                  </p>
                </div>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="action"
                  value="revision"
                  checked={selectedAction === "revision"}
                  onChange={(e) =>
                    setSelectedAction(e.target.value as "borrador" | "revision")
                  }
                  className="mr-3 w-4 h-4 text-primary"
                />
                <div>
                  <span className="text-base font-medium text-midnight_text dark:text-white">
                    Enviar a revisión CIEPI
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    El blog se enviará directamente a revisión por parte de
                    CIEPI
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}
        {/* Información de estado para edición */}
        {mode === "edit" && blog && blog.estado! > 1 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Icon
                icon="solar:info-circle-linear"
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
              />
              <div>
                <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">
                  Blog en proceso de revisión
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Este blog está actualmente en estado &ldquo;
                  {blog.estado_nombre}&rdquo;. Los cambios que hagas se
                  guardarán, pero no afectarán el proceso de revisión actual.
                </p>
              </div>
            </div>
          </div>
        )}
        {/* Formulario personalizado con ancho completo */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          <h2 className="mb-8 text-2xl font-bold text-midnight_text dark:text-white">
            Información del Blog
          </h2>
          <BlogForm
            fields={formFields}
            onSubmit={onSubmit}
            submitLabel={
              mode === "create"
                ? selectedAction === "borrador"
                  ? "Guardar Borrador"
                  : "Enviar a Revisión"
                : "Actualizar Blog"
            }
            isSubmitting={isSubmitting}
            initialValues={{
              titulo: blog?.titulo || "",
              imagen_banner: "", // Las imágenes no se precargan en file inputs
              palabras_clave: blog?.palabras_clave || [],
              contenido: blog?.contenido || [
                {
                  type: "paragraph",
                  children: [{ text: "" }],
                } as unknown as Descendant,
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
}
