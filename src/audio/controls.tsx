import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react"

// Local primitives: the app has CSS tokens and ml-button, not a component kit.
export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={`ml-button ${className}`} {...props} />
  )
}
export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="sound-field">
      <span>{label}</span>
      {children}
    </label>
  )
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />
}
export function Option(
  props: HTMLAttributes<HTMLOptionElement> & { value: string | number },
) {
  return <option {...props} />
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} />
}
export function Box(props: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />
}
export function Text(props: HTMLAttributes<HTMLParagraphElement>) {
  return <p {...props} />
}
export function Heading(props: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 {...props} />
}
export function Strong(props: HTMLAttributes<HTMLElement>) {
  return <strong {...props} />
}
export function Section(props: HTMLAttributes<HTMLElement>) {
  return <section {...props} />
}
export function Disclosure({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <details className="sound-disclosure">
      <summary>{title}</summary>
      {children}
    </details>
  )
}
export function Sample({ src }: { src: string }) {
  return (
    <audio
      key={src}
      controls
      preload="none"
      src={src}
      aria-label="Muestra gratuita de la voz"
    />
  )
}
