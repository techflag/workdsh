/**
 * Host/Client shared coordinates for the lazy Office runtime.
 *
 * The heavy editors cannot ride in the plugin's `dsh.client` bundle: every
 * application bundle in the boot graph is preloaded on first paint. They are
 * therefore a separate artifact the Host serves from `dist` and the Client
 * requests only when a document is opened.
 */

/** Static asset root owned by this plugin's single Host route. */
export const officeAssetRoot = "/workdsh-office";

/** Page-local client module the runtime artifact registers into the module table. */
export const officeRuntimeModule = "workdsh-office-runtime";

/** Runtime artifact URL, injected as a classic script before the module import. */
export const officeRuntimeScript = `${officeAssetRoot}/runtime.js`;

/** Self-contained legacy editor document, fetched on demand for an iframe `srcdoc`. */
export const officeEditorDocument = `${officeAssetRoot}/editor.html`;
