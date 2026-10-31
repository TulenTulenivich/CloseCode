import type { ReactNode, SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
}

function Svg({ size = 16, children, ...props }: IconProps & { children: ReactNode }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function FolderIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v7A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z" />
    </Svg>
  )
}

export function SettingsIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <path d="M4 12h3" />
      <path d="M11 12h9" />
      <path d="M4 17h9" />
      <path d="M17 17h3" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="17" r="2" />
    </Svg>
  )
}

export function PlusIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function ActivityIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M3 12h3.5l2-5 3 10 2.5-6 1.8 3H21" />
    </Svg>
  )
}

export function GlobeIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.3 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.3-3.4-8.5S9.7 5.9 12 3.5Z" />
    </Svg>
  )
}

export function KeyIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <circle cx="8" cy="12" r="3.5" />
      <path d="M11.5 12H21M17.5 12v3M20 12v2.5" />
    </Svg>
  )
}

export function UsersIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
      <path d="M16 6.2a3 3 0 0 1 0 5.6M18.5 19.5c-.3-2-1.2-3.4-2.6-4.1" />
    </Svg>
  )
}

export function PlayIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M8 5.5 18 12 8 18.5v-13Z" />
    </Svg>
  )
}

export function ListIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M8.5 6.5H20M8.5 12H20M8.5 17.5H20" />
      <path d="M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01" />
    </Svg>
  )
}

export function SendIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </Svg>
  )
}

export function StopIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function CheckIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="m4.5 12.5 5 5L20 6.5" />
    </Svg>
  )
}

export function XIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  )
}

export function FileIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M6 3h7l5 5v13H6V3Z" />
      <path d="M13 3v5h5" />
    </Svg>
  )
}

export function ImageIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="8.8" cy="9.4" r="1.6" />
      <path d="m4.8 17 4.7-4.4 3.1 3 3-2.7 4.4 3.9" />
    </Svg>
  )
}

export function TrashIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </Svg>
  )
}

export function RefreshIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </Svg>
  )
}

export function LockIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  )
}

export function SparkIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9 12 3.5Z" />
      <path d="M19 16.5v3M17.5 18h3" />
    </Svg>
  )
}

export function AlertIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M12 3.5 21 19H3L12 3.5Z" />
      <path d="M12 9v5" />
      <path d="M12 16.6v.1" />
    </Svg>
  )
}

export function ChevronDownIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="m6 9 6 6 6-6" />
    </Svg>
  )
}

export function ChevronUpIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="m6 15 6-6 6 6" />
    </Svg>
  )
}

export function ChevronRightIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  )
}

export function ComposeIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </Svg>
  )
}

export function MoreIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <circle cx="5.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function PaperclipIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="m21.4 11.05-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.67 3.67 0 0 1 5.19 5.19l-8.49 8.49a1.83 1.83 0 0 1-2.6-2.59l7.79-7.79" />
    </Svg>
  )
}

export function ArrowRightIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Svg>
  )
}

export function ExpandIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M9 4H4v5" />
      <path d="m4 4 5 5" />
      <path d="M15 20h5v-5" />
      <path d="m20 20-5-5" />
    </Svg>
  )
}

export function MinimizeIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
    </Svg>
  )
}

export function MaximizeIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <rect x="5" y="5" width="14" height="14" rx="1.5" />
    </Svg>
  )
}

export function RestoreIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <rect x="4.5" y="7.5" width="12" height="12" rx="1.5" />
      <path d="M8.5 7.5V5.8A1.3 1.3 0 0 1 9.8 4.5h8.4a1.3 1.3 0 0 1 1.3 1.3v8.4a1.3 1.3 0 0 1-1.3 1.3h-1.7" />
    </Svg>
  )
}

export function BugIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <rect x="8" y="7" width="8" height="12" rx="4" />
      <path d="M9.5 7a2.5 2.5 0 0 1 5 0" />
      <path d="M8 11H4.5M19.5 11H16M8 16l-3 2M19 18l-3-2M8 7 5.5 4.5M16 7l2.5-2.5" />
      <path d="M12 11v4" />
    </Svg>
  )
}

export function LayersIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12.5 9 5 9-5" />
      <path d="m3 16.5 9 5 9-5" />
    </Svg>
  )
}

export function BookIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      <path d="M8 7h8M8 10.5h6" />
    </Svg>
  )
}

export function CompressIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </Svg>
  )
}

export function ShieldIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M12 3 4.5 6v5.5c0 4.5 3 7.8 7.5 9.5 4.5-1.7 7.5-5 7.5-9.5V6L12 3Z" />
      <path d="m8.8 12 2.2 2.2 4.4-4.4" />
    </Svg>
  )
}

export function BoltIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <path d="M13 2.5 5 13.5h6L11 21.5l8-11h-6l0-8Z" />
    </Svg>
  )
}

export function InfoIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 10.5v6M12 7.5v.1" />
    </Svg>
  )
}

export function TerminalIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="m7 9 3 3-3 3M12.5 15H17" />
    </Svg>
  )
}

export function ScreenIcon(props: IconProps): ReactNode {
  return (
    <Svg {...props}>
      <rect x="2.5" y="4.5" width="19" height="12.5" rx="2.5" />
      <path d="M9 20.5h6M12 17v3.5" />
      <circle cx="12" cy="10.75" r="2.4" />
    </Svg>
  )
}
