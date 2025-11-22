import * as React from "react"

export function useBreakpoint(breakpoint: number) {
  // Initialize as false to match server-side rendering (desktop-first approach)
  // This prevents hydration mismatches by ensuring consistent initial render
  const [isBelowBreakpoint, setIsBelowBreakpoint] = React.useState(false)

  React.useEffect(() => {
    // On mount, immediately check the actual window size
    setIsBelowBreakpoint(window.innerWidth < breakpoint)

    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => {
      setIsBelowBreakpoint(window.innerWidth < breakpoint)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return isBelowBreakpoint
}
