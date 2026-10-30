import Markdown from "react-markdown";

export default function ReadingContent({ content }: { content: string }) {
  return (
    <Markdown
      skipHtml
      components={{
        h1: ({ children }) => <h2>{children}</h2>,
        p: ({ children }) => <p className="mb-9 font-serif last:mb-0 md:mb-10 md:last:mb-0">{children}</p>,
        a: ({ href, title, children }) => href
          ? <a href={href} title={title}>{children}</a>
          : <span>{children}</span>,
      }}
    >
      {content}
    </Markdown>
  );
}
