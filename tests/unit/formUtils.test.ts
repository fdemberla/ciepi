import { describe, it, expect } from "vitest";
import {
  flattenFields,
  validateField,
  validateFields,
  serializeValues,
  mergeInitialValues,
  isSlateEmpty,
} from "@/components/Form.utils";
import type { FormFieldOrSection } from "@/components/Form.types";
import { colorTextoSeguro } from "@/components/slateColor";

const campos: FormFieldOrSection[] = [
  {
    name: "datos",
    label: "Datos",
    type: "section",
    fields: [
      {
        name: "nombre",
        label: "Nombre",
        type: "text",
        required: true,
        errorMessage: "El nombre es obligatorio",
      },
      {
        name: "sub",
        label: "Sub",
        type: "section",
        fields: [
          { name: "telefono", label: "Teléfono", type: "tel", required: true },
        ],
      },
    ],
  },
  { name: "correo", label: "Correo", type: "email" },
  { name: "bloqueado", label: "Bloqueado", type: "text", required: true, disabled: true },
];

describe("flattenFields", () => {
  it("entra en secciones anidadas", () => {
    expect(flattenFields(campos).map((f) => f.name)).toEqual([
      "nombre",
      "telefono",
      "correo",
      "bloqueado",
    ]);
  });
});

describe("validateFields", () => {
  it("valida campos dentro de secciones con su errorMessage", () => {
    const errores = validateFields(campos, { telefono: "abc" });
    expect(errores.nombre).toBe("El nombre es obligatorio");
    expect(errores.telefono).toMatch(/teléfono inválido/i);
  });

  it("omite campos deshabilitados", () => {
    expect(validateFields(campos, {}).bloqueado).toBeUndefined();
  });

  it("acepta datos válidos", () => {
    expect(
      validateFields(campos, {
        nombre: "Ana",
        telefono: "6666-6666",
        correo: "ana@correo.pa",
      }),
    ).toEqual({});
  });
});

describe("validateField", () => {
  const tel = { name: "t", label: "T", type: "tel" as const, required: true, errorMessage: "El teléfono es obligatorio" };

  it("teléfono: formatos de Panamá", () => {
    for (const ok of ["666-6666", "6666-6666", "66666666", "+507 6666-6666"]) {
      expect(validateField(tel, ok)).toBe("");
    }
    for (const bad of ["12", "abc", "6666-66666"]) {
      expect(validateField(tel, bad)).toMatch(/inválido/);
    }
  });

  it("obligatorio usa errorMessage; el formato usa su propio mensaje", () => {
    expect(validateField(tel, "")).toBe("El teléfono es obligatorio");
    expect(validateField(tel, "  ")).toBe("El teléfono es obligatorio");
    expect(validateField(tel, "12")).not.toBe("El teléfono es obligatorio");
  });

  it("regex propio con errorMessage", () => {
    const f = { name: "c", label: "C", type: "text" as const, regex: "^\\d+$", errorMessage: "Solo números" };
    expect(validateField(f, "12a")).toBe("Solo números");
    expect(validateField(f, "")).toBe("");
  });

  it("Slate obligatorio vacío", () => {
    const f = { name: "d", label: "D", type: "textarea-slate" as const, required: true };
    const vacio = [{ type: "paragraph", children: [{ text: " " }] }];
    expect(isSlateEmpty(vacio)).toBe(true);
    expect(validateField(f, vacio)).toBe("Este campo es obligatorio.");
    expect(
      validateField(f, [{ type: "paragraph", children: [{ text: "Hola" }] }]),
    ).toBe("");
  });

  it("archivo obligatorio", () => {
    const f = { name: "a", label: "A", type: "file" as const, required: true };
    expect(validateField(f, [])).toBe("Este campo es obligatorio.");
    expect(validateField(f, null)).toBe("Este campo es obligatorio.");
  });
});

describe("initialValues estables", () => {
  it("un literal nuevo con el mismo contenido serializa igual", () => {
    expect(serializeValues({ activo: "true", a: 1 })).toBe(
      serializeValues({ a: 1, activo: "true" }),
    );
    expect(serializeValues(undefined)).toBe(serializeValues({}));
  });

  it("detecta cambios de contenido", () => {
    expect(serializeValues({ a: 1 })).not.toBe(serializeValues({ a: 2 }));
  });

  it("la fusión conserva lo escrito que initialValues no trae", () => {
    expect(
      mergeInitialValues({ nombre: "Ana", correo: "x" }, { correo: "y", distrito_id: null }),
    ).toEqual({ nombre: "Ana", correo: "y", distrito_id: null });
    const actual = { a: 1 };
    expect(mergeInitialValues(actual, {})).toBe(actual);
  });
});

describe("colorTextoSeguro", () => {
  it("descarta negro, blanco y casi negro/blanco", () => {
    for (const c of ["#000000", "#000", "#FFFFFF", "#fff", "black", "white", "#222222", "#f5f5f5", "rgb(0, 0, 0)"]) {
      expect(colorTextoSeguro(c)).toBeUndefined();
    }
  });

  it("mantiene colores de la paleta", () => {
    for (const c of ["#EF4444", "#3B82F6", "#EAB308", "#22C55E"]) {
      expect(colorTextoSeguro(c)).toBe(c);
    }
  });

  it("valores vacíos o no texto", () => {
    expect(colorTextoSeguro(undefined)).toBeUndefined();
    expect(colorTextoSeguro("")).toBeUndefined();
    expect(colorTextoSeguro(123)).toBeUndefined();
  });
});
