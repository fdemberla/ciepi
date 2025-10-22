import React from "react";

interface SlateNode {
  type?: string;
  children?: SlateNode[];
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  color?: string; // For text color
  fontSize?: string; // For font size
  url?: string; // For link nodes
  align?: string; // For text alignment
  indent?: number; // For indentation
}

interface SlateRendererProps {
  content: unknown;
  className?: string;
}

const SlateRenderer: React.FC<SlateRendererProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  // Parse content if it's a string
  let parsedContent: SlateNode[];
  try {
    parsedContent = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    return <p className={className}>{String(content)}</p>;
  }

  // Render a single node
  const renderNode = (node: SlateNode, index: number): React.ReactNode => {
    // Handle text nodes
    if (node.text !== undefined) {
      let textContent: React.ReactNode = node.text;

      // Create inline styles for color and font size
      const textStyles: React.CSSProperties = {};
      if (node.color) {
        textStyles.color = node.color;
      }
      if (node.fontSize) {
        textStyles.fontSize = node.fontSize;
      }

      // Apply text formatting
      if (node.bold) {
        textContent = <strong>{textContent}</strong>;
      }
      if (node.italic) {
        textContent = <em>{textContent}</em>;
      }
      if (node.underline) {
        textContent = <u>{textContent}</u>;
      }
      if (node.strikethrough) {
        textContent = <s>{textContent}</s>;
      }
      if (node.code) {
        textContent = (
          <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono">
            {textContent}
          </code>
        );
      }

      return (
        <span key={index} style={textStyles}>
          {textContent}
        </span>
      );
    }

    // Handle block nodes
    const children = node.children?.map((child, i) => renderNode(child, i));

    // Get alignment and indentation styles
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

    const getIndentStyle = (indent?: number) => {
      return indent ? { marginLeft: `${indent * 24}px` } : {};
    };

    switch (node.type) {
      case "paragraph":
        return (
          <p
            key={index}
            className={`mb-4 text-dark_grey dark:text-gray-300 text-lg leading-relaxed ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </p>
        );

      case "heading-one":
        return (
          <h1
            key={index}
            className={`text-4xl font-bold text-midnight_text dark:text-white mb-6 mt-8 ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </h1>
        );

      case "heading-two":
        return (
          <h2
            key={index}
            className={`text-3xl font-bold text-midnight_text dark:text-white mb-4 mt-6 ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </h2>
        );

      case "heading-three":
        return (
          <h3
            key={index}
            className={`text-2xl font-semibold text-midnight_text dark:text-white mb-3 mt-5 ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </h3>
        );

      case "heading-four":
        return (
          <h4
            key={index}
            className={`text-xl font-semibold text-midnight_text dark:text-white mb-3 mt-4 ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </h4>
        );

      case "block-quote":
        return (
          <blockquote
            key={index}
            className={`border-l-4 border-[#1A21BC] pl-6 py-2 my-6 bg-gray-50 dark:bg-gray-800 rounded-r-lg italic text-dark_grey dark:text-gray-300 ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </blockquote>
        );

      case "numbered-list":
        return (
          <ol
            key={index}
            className={`list-decimal list-inside space-y-2 mb-4 ml-4 text-dark_grey dark:text-gray-300 ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </ol>
        );

      case "bulleted-list":
        return (
          <ul
            key={index}
            className={`list-disc list-inside space-y-2 mb-4 ml-4 text-dark_grey dark:text-gray-300 ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </ul>
        );

      case "list-item":
        return (
          <li key={index} className="text-lg">
            {children}
          </li>
        );

      case "link":
        return (
          <a
            key={index}
            href={node.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline transition-colors"
          >
            {children}
          </a>
        );

      case "code-block":
        return (
          <pre
            key={index}
            className={`bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4 text-sm font-mono ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            <code>{children}</code>
          </pre>
        );

      default:
        return (
          <p
            key={index}
            className={`mb-4 text-dark_grey dark:text-gray-300 text-lg leading-relaxed ${getAlignmentClass(
              node.align
            )}`}
            style={getIndentStyle(node.indent)}
          >
            {children}
          </p>
        );
    }
  };

  return (
    <div className={`slate-content ${className}`}>
      {Array.isArray(parsedContent) &&
        parsedContent.map((node, index) => renderNode(node, index))}
    </div>
  );
};

export default SlateRenderer;
