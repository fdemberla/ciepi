"use client";
import React, { useMemo, useCallback, ReactNode, useState } from "react";
import {
  createEditor,
  Descendant,
  Transforms,
  Editor,
  Element as SlateElement,
  Range,
} from "slate";
import { Slate, Editable, withReact, useSlate } from "slate-react";
import { Icon } from "@iconify/react";
// Toolbar button component
interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  label: string;
  children?: ReactNode;
}
const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  active,
  label,
  children,
}) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`px-2 py-1 rounded hover:bg-gray-200 ${
      active ? "bg-gray-300" : ""
    }`}
    title={label}
  >
    {children || label}
  </button>
);

// Helpers for marks
const isMarkActive = (editor: Editor, format: string) => {
  const marks = Editor.marks(editor) as { [key: string]: unknown } | null;
  return marks ? marks[format] === true : false;
};
const toggleMark = (editor: Editor, format: string) => {
  const isActive = isMarkActive(editor, format);
  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

// Color and font size helpers
const getColorMark = (editor: Editor): string => {
  const marks = Editor.marks(editor) as { color?: string } | null;
  return marks?.color || "#000000";
};

const setColorMark = (editor: Editor, color: string) => {
  Editor.addMark(editor, "color", color);
};

const getFontSizeMark = (editor: Editor): string => {
  const marks = Editor.marks(editor) as { fontSize?: string } | null;
  return marks?.fontSize || "1rem";
};

const setFontSizeMark = (editor: Editor, fontSize: string) => {
  Editor.addMark(editor, "fontSize", fontSize);
};

// Hyperlink helpers
const isLinkActive = (editor: Editor) => {
  const [link] = Array.from(
    Editor.nodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as { type?: string }).type === "link",
    })
  );
  return !!link;
};

const unwrapLink = (editor: Editor) => {
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      (n as { type?: string }).type === "link",
  });
};

const wrapLink = (editor: Editor, url: string) => {
  if (isLinkActive(editor)) {
    unwrapLink(editor);
  }

  const { selection } = editor;
  const isCollapsed = selection && Range.isCollapsed(selection);
  const link = {
    type: "link",
    url,
    children: isCollapsed ? [{ text: url }] : [],
  };

  if (isCollapsed) {
    Transforms.insertNodes(editor, link);
  } else {
    Transforms.wrapNodes(editor, link, { split: true });
    Transforms.collapse(editor, { edge: "end" });
  }
};

const insertLink = (editor: Editor, url: string) => {
  if (editor.selection) {
    wrapLink(editor, url);
  }
};

// Helpers for block types
const LIST_TYPES = ["numbered-list", "bulleted-list"];
const INDENTABLE_TYPES = [
  "paragraph",
  "heading-one",
  "heading-two",
  "heading-three",
  "heading-four",
];
const isBlockActive = (editor: Editor, format: string, blockType = "type") => {
  const [match] = Array.from(
    Editor.nodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as unknown as { [key: string]: unknown })[blockType] === format,
    })
  );
  return !!match;
};

// Alignment helpers
const isAlignmentActive = (editor: Editor, alignment: string) => {
  const [match] = Array.from(
    Editor.nodes(editor, {
      match: (n) =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (n as { align?: string }).align === alignment,
    })
  );
  return !!match;
};

const toggleAlignment = (editor: Editor, alignment: string) => {
  const isActive = isAlignmentActive(editor, alignment);
  Transforms.setNodes(
    editor,
    { align: isActive ? undefined : alignment } as Partial<SlateElement>,
    { match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n) }
  );
};
const toggleBlock = (editor: Editor, format: string) => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes((n as { type?: string }).type as string),
    split: true,
  });

  let newType;
  if (isActive) {
    newType = "paragraph";
  } else {
    newType = isList ? "list-item" : format;
  }
  Transforms.setNodes(editor, { type: newType } as Partial<SlateElement>);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

// Indentation helpers
const indent = (editor: Editor) => {
  Transforms.setNodes(editor, { indent: 1 } as Partial<SlateElement>, {
    match: (n) =>
      SlateElement.isElement(n) &&
      INDENTABLE_TYPES.includes((n as { type?: string }).type as string),
  });
};
const outdent = (editor: Editor) => {
  Transforms.setNodes(editor, { indent: 0 } as Partial<SlateElement>, {
    match: (n) =>
      SlateElement.isElement(n) &&
      INDENTABLE_TYPES.includes((n as { type?: string }).type as string),
  });
};

interface SlateEditorFieldProps {
  value?: Descendant[];
  onChange: (value: Descendant[]) => void;
  id: string;
  name: string;
  required?: boolean;
}

const initialValue: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  } as unknown as Descendant,
];

const SlateEditorField: React.FC<SlateEditorFieldProps> = ({
  value,
  onChange,
  id,
  name,
  required = false,
}) => {
  const editor = useMemo(() => withReact(createEditor()), []);

  // Render leaf for marks
  type CustomLeaf = import("slate").BaseText & {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    fontSize?: string;
  };
  const renderLeaf = useCallback(
    (props: import("slate-react").RenderLeafProps) => {
      let { children } = props;
      const leaf = props.leaf as CustomLeaf;

      const style: React.CSSProperties = {};
      if (leaf.color) {
        style.color = leaf.color;
      }
      if (leaf.fontSize) {
        style.fontSize = leaf.fontSize;
      }

      if (leaf.bold) {
        children = <strong>{children}</strong>;
      }
      if (leaf.italic) {
        children = <em>{children}</em>;
      }
      if (leaf.underline) {
        children = <u>{children}</u>;
      }
      return (
        <span {...props.attributes} style={style}>
          {children}
        </span>
      );
    },
    []
  );

  // Render element for blocks
  const renderElement = useCallback(
    (props: import("slate-react").RenderElementProps) => {
      const { element, attributes, children } = props;
      const align = (element as { align?: string }).align;
      const indent = (element as { indent?: number }).indent;

      const getAlignmentClass = (alignment?: string) => {
        switch (alignment) {
          case "center":
            return "text-center";
          case "right":
            return "text-right";
          case "justify":
            return "text-justify";
          default:
            return "text-left";
        }
      };

      const style = {
        marginLeft: indent ? 24 : 0,
      };

      switch ((element as { type?: string }).type) {
        case "heading-one":
          return (
            <h1
              {...attributes}
              className={`text-2xl font-bold my-2 ${getAlignmentClass(align)}`}
              style={style}
            >
              {children}
            </h1>
          );
        case "heading-two":
          return (
            <h2
              {...attributes}
              className={`text-xl font-bold my-2 ${getAlignmentClass(align)}`}
              style={style}
            >
              {children}
            </h2>
          );
        case "heading-three":
          return (
            <h3
              {...attributes}
              className={`text-lg font-bold my-2 ${getAlignmentClass(align)}`}
              style={style}
            >
              {children}
            </h3>
          );
        case "heading-four":
          return (
            <h4
              {...attributes}
              className={`text-base font-bold my-2 ${getAlignmentClass(align)}`}
              style={style}
            >
              {children}
            </h4>
          );
        case "numbered-list":
          return (
            <ol
              {...attributes}
              className={`list-decimal ml-6 ${getAlignmentClass(align)}`}
              style={style}
            >
              {children}
            </ol>
          );
        case "bulleted-list":
          return (
            <ul
              {...attributes}
              className={`list-disc ml-6 ${getAlignmentClass(align)}`}
              style={style}
            >
              {children}
            </ul>
          );
        case "list-item":
          return <li {...attributes}>{children}</li>;
        case "link":
          return (
            <a
              {...attributes}
              href={(element as { url?: string }).url}
              className="text-blue-600 underline hover:text-blue-800"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        default:
          return (
            <p
              {...attributes}
              className={getAlignmentClass(align)}
              style={style}
            >
              {children}
            </p>
          );
      }
    },
    []
  );

  // Check if the editor is empty for required validation
  const isEmpty =
    !value ||
    value.length === 0 ||
    value.every(
      (node) =>
        "children" in node &&
        Array.isArray(
          (node as Descendant & { children?: Descendant[] }).children
        ) &&
        (
          (node as Descendant & { children?: Descendant[] }).children || []
        ).every((child) =>
          typeof (child as { text?: string }).text === "string"
            ? (child as { text: string }).text.trim() === ""
            : true
        )
    );

  // Link button component
  const LinkButton = () => {
    const editor = useSlate();
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");

    const handleAddLink = () => {
      if (linkUrl && linkUrl.trim()) {
        insertLink(editor, linkUrl.trim());
        setShowLinkInput(false);
        setLinkUrl("");
      }
    };

    const handleRemoveLink = () => {
      if (isLinkActive(editor)) {
        unwrapLink(editor);
      }
    };

    return (
      <div className="relative">
        <ToolbarButton
          onClick={() => {
            if (isLinkActive(editor)) {
              handleRemoveLink();
            } else {
              setShowLinkInput(!showLinkInput);
            }
          }}
          active={isLinkActive(editor)}
          label={isLinkActive(editor) ? "Quitar enlace" : "Agregar enlace"}
        >
          <Icon icon="ic:baseline-add-link" className="w-4 h-4" />
        </ToolbarButton>

        {showLinkInput && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-2 z-10 min-w-64">
            <div className="flex gap-2">
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://ejemplo.com"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddLink();
                  } else if (e.key === "Escape") {
                    setShowLinkInput(false);
                    setLinkUrl("");
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleAddLink}
                className="px-2 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                <Icon icon="solar:check-linear" className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setShowLinkInput(false);
                  setLinkUrl("");
                }}
                className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                <Icon icon="solar:close-linear" className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Color picker component
  const ColorPickerButton = () => {
    const editor = useSlate();
    const [showColorPicker, setShowColorPicker] = useState(false);
    const currentColor = getColorMark(editor);

    const colors = [
      "#000000", // Black
      "#FFFFFF", // White
      "#EF4444", // Red
      "#F97316", // Orange
      "#EAB308", // Yellow
      "#22C55E", // Green
      "#06B6D4", // Cyan
      "#3B82F6", // Blue
      "#8B5CF6", // Purple
      "#EC4899", // Pink
    ];

    return (
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setShowColorPicker(!showColorPicker);
          }}
          className="px-2 py-1 rounded hover:bg-gray-200 flex items-center gap-1"
          title="Color de texto"
        >
          <Icon icon="ic:baseline-format-color-text" className="w-4 h-4" />
          <div
            className="w-3 h-3 rounded border border-gray-400"
            style={{ backgroundColor: currentColor }}
          />
        </button>

        {showColorPicker && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-md shadow-lg p-6 z-10 grid grid-cols-5 gap-4 w-max">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setColorMark(editor, color);
                  setShowColorPicker(false);
                }}
                className="w-12 h-12 rounded border-3 hover:border-gray-600 transition-all cursor-pointer hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: currentColor === color ? "#000000" : "#ddd",
                }}
                title={color}
              />
            ))}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                Editor.removeMark(editor, "color");
                setShowColorPicker(false);
              }}
              className="col-span-5 px-4 py-3 text-sm bg-gray-200 hover:bg-gray-300 rounded font-medium transition-colors"
            >
              Restablecer color
            </button>
          </div>
        )}
      </div>
    );
  };

  // Font size selector component
  const FontSizeSelector = () => {
    const editor = useSlate();
    const [showSizeMenu, setShowSizeMenu] = useState(false);
    const currentSize = getFontSizeMark(editor);

    const fontSizes = [
      { label: "Pequeño", value: "0.875rem" },
      { label: "Normal", value: "1rem" },
      { label: "Grande", value: "1.125rem" },
      { label: "Muy grande", value: "1.25rem" },
      { label: "Enorme", value: "1.5rem" },
    ];

    return (
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setShowSizeMenu(!showSizeMenu);
          }}
          className="px-2 py-1 rounded hover:bg-gray-200 flex items-center gap-1 text-sm"
          title="Tamaño de fuente"
        >
          <Icon icon="ic:baseline-format-size" className="w-4 h-4" />
          <span className="text-xs font-medium">
            {fontSizes.find((s) => s.value === currentSize)?.label || "Normal"}
          </span>
        </button>

        {showSizeMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-1 z-10 min-w-32">
            {fontSizes.map((size) => (
              <button
                key={size.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFontSizeMark(editor, size.value);
                  setShowSizeMenu(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  currentSize === size.value
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-100"
                }`}
                style={{ fontSize: size.value }}
              >
                {size.label}
              </button>
            ))}
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                Editor.removeMark(editor, "fontSize");
                setShowSizeMenu(false);
              }}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 mt-1 border-t"
            >
              Restablecer
            </button>
          </div>
        )}
      </div>
    );
  };

  // Toolbar component
  const Toolbar = () => {
    const editor = useSlate();
    return (
      <div className="flex flex-wrap gap-1 mb-2 relative">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => toggleMark(editor, "bold")}
          active={isMarkActive(editor, "bold")}
          label="Negrita"
        >
          <Icon icon="ic:baseline-format-bold" className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleMark(editor, "italic")}
          active={isMarkActive(editor, "italic")}
          label="Itálica"
        >
          <Icon icon="ic:baseline-format-italic" className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleMark(editor, "underline")}
          active={isMarkActive(editor, "underline")}
          label="Subrayado"
        >
          <Icon icon="ic:baseline-format-underlined" className="w-4 h-4" />
        </ToolbarButton>

        {/* Separator */}
        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Color and Font Size */}
        <ColorPickerButton />
        <FontSizeSelector />

        {/* Separator */}
        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Alignment */}
        <ToolbarButton
          onClick={() => toggleAlignment(editor, "left")}
          active={
            isAlignmentActive(editor, "left") ||
            (!isAlignmentActive(editor, "center") &&
              !isAlignmentActive(editor, "right") &&
              !isAlignmentActive(editor, "justify"))
          }
          label="Alinear a la izquierda"
        >
          <Icon icon="ic:baseline-format-align-left" className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleAlignment(editor, "center")}
          active={isAlignmentActive(editor, "center")}
          label="Centrar"
        >
          <Icon icon="ic:baseline-format-align-center" className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleAlignment(editor, "right")}
          active={isAlignmentActive(editor, "right")}
          label="Alinear a la derecha"
        >
          <Icon icon="ic:baseline-format-align-right" className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleAlignment(editor, "justify")}
          active={isAlignmentActive(editor, "justify")}
          label="Justificar"
        >
          <Icon icon="ic:baseline-format-align-justify" className="w-4 h-4" />
        </ToolbarButton>

        {/* Separator */}
        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Lists */}
        <ToolbarButton
          onClick={() => toggleBlock(editor, "bulleted-list")}
          active={isBlockActive(editor, "bulleted-list")}
          label="Lista de viñetas"
        >
          <Icon icon="ic:baseline-format-list-bulleted" className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "numbered-list")}
          active={isBlockActive(editor, "numbered-list")}
          label="Lista numerada"
        >
          <Icon icon="ic:baseline-format-list-numbered" className="w-4 h-4" />
        </ToolbarButton>

        {/* Separator */}
        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Headings */}
        <ToolbarButton
          onClick={() => toggleBlock(editor, "heading-one")}
          active={isBlockActive(editor, "heading-one")}
          label="Título 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "heading-two")}
          active={isBlockActive(editor, "heading-two")}
          label="Título 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "heading-three")}
          active={isBlockActive(editor, "heading-three")}
          label="Título 3"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "heading-four")}
          active={isBlockActive(editor, "heading-four")}
          label="Título 4"
        >
          H4
        </ToolbarButton>

        {/* Separator */}
        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Indentation */}
        <ToolbarButton onClick={() => indent(editor)} label="Indentar">
          <Icon icon="ic:baseline-format-indent-increase" className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => outdent(editor)}
          label="Quitar indentación"
        >
          <Icon icon="ic:baseline-format-indent-decrease" className="w-4 h-4" />
        </ToolbarButton>

        {/* Separator */}
        <div className="w-px bg-gray-300 mx-1"></div>

        {/* Links */}
        <LinkButton />
      </div>
    );
  };

  return (
    <div className="border focus-within:ring-gray-500 focus-within:border-gray-900 w-full sm:text-sm border-gray-300 rounded-md focus:outline-none text-gray-600 px-4 py-2 h-full bg-white flex flex-col">
      <Slate
        editor={editor}
        initialValue={value && value.length ? value : initialValue}
        onChange={onChange}
      >
        <Toolbar />
        <Editable
          id={id}
          name={name}
          placeholder="Escribe aquí..."
          className="flex-1 focus:outline-none overflow-y-auto min-h-screen"
          renderLeaf={renderLeaf}
          renderElement={renderElement}
        />
      </Slate>
      {required && isEmpty && (
        <span className="text-red-500 text-sm mt-1">
          Este campo es obligatorio.
        </span>
      )}
    </div>
  );
};

export default SlateEditorField;
