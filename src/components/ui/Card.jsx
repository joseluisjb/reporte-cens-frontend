import { cx } from './cx'

export default function Card({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag className={cx('rounded-card border border-line bg-white', className)} {...rest}>
      {children}
    </Tag>
  )
}
