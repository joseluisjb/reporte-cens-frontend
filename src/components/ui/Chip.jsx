export default function Chip({ children, title }) {
  return (
    <span
      title={title}
      className="inline-block rounded-md border border-green-200 bg-green-50 px-[9px] py-[3px] text-xs font-semibold whitespace-nowrap text-green-800"
    >
      {children}
    </span>
  )
}
