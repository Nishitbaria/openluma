/**
 * Renders a schema.org JSON-LD block.
 *
 * The payload is inert data, not executed script, but it still lands inside a
 * `<script>` tag — so values are serialised with `<` escaped to make the block
 * impossible to break out of via user-supplied event titles or bios.
 */
export function JsonLd({ data, id }: { data: unknown; id?: string }) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be emitted as raw script content; the payload is JSON-serialised and `<` is escaped
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
      id={id}
      type="application/ld+json"
    />
  );
}
