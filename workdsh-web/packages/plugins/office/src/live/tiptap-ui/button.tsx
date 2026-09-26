// Official Tiptap Button primitive, no-tooltip branch; MIT, see LICENSE.
import * as React from "react";
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({className, children, ...props}, ref) => <button className={["tiptap-button", className].filter(Boolean).join(" ")} ref={ref} {...props}>{children}</button>);
Button.displayName = "Button";
