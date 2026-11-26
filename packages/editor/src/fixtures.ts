/**
 * The editor parity corpus.
 *
 * Each entry is raw HTML as it could arrive from the other client or from an
 * import. `fixtures.golden.json` stores what this extension list normalizes
 * it to (HTML, text, JSON). Regenerate with:
 *
 *   UPDATE_FIXTURES=1 pnpm --filter @withink/editor test
 *
 * Add a fixture whenever an extension, mark, node or serialization rule
 * changes; web and mobile both fail their suites until the goldens match.
 */

export interface EditorFixture {
  name: string;
  html: string;
}

export const EDITOR_FIXTURES: EditorFixture[] = [
  {
    name: "marks",
    html: "<p><strong>Bold</strong> <em>italic</em> <u>under</u> <s>strike</s> <code>code</code> <mark>mark</mark></p>",
  },
  {
    name: "headings",
    html: "<h1>One</h1><h2>Two</h2><h3>Three</h3><p>Body</p>",
  },
  {
    name: "lists",
    html: "<ul><li><p>alpha</p></li><li><p>beta</p></li></ul><ol><li><p>one</p></li><li><p>two</p></li></ol>",
  },
  {
    name: "task-list",
    html: '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked="checked"><span></span></label><div><p>done</p></div></li><li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>todo</p></div></li></ul>',
  },
  {
    name: "quote-code-rule",
    html: "<blockquote><p>quoted</p></blockquote><pre><code>const x = 1 &lt; 2;</code></pre><hr>",
  },
  {
    name: "link",
    html: '<p><a rel="noopener noreferrer" class="text-accent underline cursor-pointer" href="https://example.com/a?b=1&amp;c=2">Example</a></p>',
  },
  {
    name: "image",
    html: '<p><img src="https://assets.withink.me/photo.webp" alt="A view"></p>',
  },
  {
    name: "bengali",
    html: "<p>আমি বাংলায় লিখি। আজকের দিনটি সুন্দর।</p>",
  },
  {
    name: "escaping",
    html: '<p>A &lt; B &amp;&amp; "quoted" &gt; C</p>',
  },
  {
    name: "long-form",
    html: "<p>First paragraph with <strong>bold</strong> and <em>italic</em> text.</p><p>Second paragraph, <u>underlined</u> a bit.</p><ul><li><p>a point</p></li><li><p>another point</p></li></ul><p>Closing line with a <code>snippet</code>.</p>",
  },
];
