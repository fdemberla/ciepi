"use client";
import React, { useMemo, useCallback, ReactNode } from "react";
import {
  createEditor,
  Descendant,
  Transforms,
  Editor,
  Element as SlateElement,
} from "slate";
import { Slate, Editable, withReact, useSlate } from "slate-react";
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
    children: [{ text: "" }],
  },
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
  };
  const renderLeaf = useCallback(
    (props: import("slate-react").RenderLeafProps) => {
      let { children } = props;
      const leaf = props.leaf as CustomLeaf;
      if (leaf.bold) {
        children = <strong>{children}</strong>;
      }
      if (leaf.italic) {
        children = <em>{children}</em>;
      }
      if (leaf.underline) {
        children = <u>{children}</u>;
      }
      return <span {...props.attributes}>{children}</span>;
    },
    []
  );

  // Render element for blocks
  const renderElement = useCallback(
    (props: import("slate-react").RenderElementProps) => {
      const { element, attributes, children } = props;
      switch ((element as { type?: string }).type) {
        case "heading-one":
          return (
            <h1 {...attributes} className="text-2xl font-bold my-2">
              {children}
            </h1>
          );
        case "heading-two":
          return (
            <h2 {...attributes} className="text-xl font-bold my-2">
              {children}
            </h2>
          );
        case "heading-three":
          return (
            <h3 {...attributes} className="text-lg font-bold my-2">
              {children}
            </h3>
          );
        case "heading-four":
          return (
            <h4 {...attributes} className="text-base font-bold my-2">
              {children}
            </h4>
          );
        case "numbered-list":
          return (
            <ol {...attributes} className="list-decimal ml-6">
              {children}
            </ol>
          );
        case "bulleted-list":
          return (
            <ul {...attributes} className="list-disc ml-6">
              {children}
            </ul>
          );
        case "list-item":
          return <li {...attributes}>{children}</li>;
        default:
          return (
            <p
              {...attributes}
              style={{
                marginLeft: (element as { indent?: number }).indent ? 24 : 0,
              }}
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

  // Toolbar component
  const Toolbar = () => {
    const editor = useSlate();
    return (
      <div className="flex flex-wrap gap-1 mb-2">
        <ToolbarButton
          onClick={() => toggleMark(editor, "bold")}
          active={isMarkActive(editor, "bold")}
          label="Negrita"
        >
          <b>B</b>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleMark(editor, "italic")}
          active={isMarkActive(editor, "italic")}
          label="Itálica"
        >
          <i>I</i>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleMark(editor, "underline")}
          active={isMarkActive(editor, "underline")}
          label="Subrayado"
        >
          <u>U</u>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "numbered-list")}
          active={isBlockActive(editor, "numbered-list")}
          label="Lista numerada"
        >
          1.
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "bulleted-list")}
          active={isBlockActive(editor, "bulleted-list")}
          label="Lista de viñetas"
        >
          •
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "heading-one")}
          active={isBlockActive(editor, "heading-one")}
          label="H1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "heading-two")}
          active={isBlockActive(editor, "heading-two")}
          label="H2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "heading-three")}
          active={isBlockActive(editor, "heading-three")}
          label="H3"
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          onClick={() => toggleBlock(editor, "heading-four")}
          active={isBlockActive(editor, "heading-four")}
          label="H4"
        >
          H4
        </ToolbarButton>
        {/* Indent/Outdent: for demo, just toggles indent property */}
        <ToolbarButton onClick={() => indent(editor)} label="Indentar">
          →
        </ToolbarButton>
        <ToolbarButton
          onClick={() => outdent(editor)}
          label="Quitar indentación"
        >
          ←
        </ToolbarButton>
      </div>
    );
  };

  return (
    <div className="border focus-within:ring-gray-500 focus-within:border-gray-900 w-full sm:text-sm border-gray-300 rounded-md focus:outline-none text-gray-600 px-4 py-2 min-h-[100px] bg-white">
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
          className="min-h-[80px] focus:outline-none"
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
