import { useMediaQuery } from './useMediaQuery'

export function useResponsive() {
  const isMobile  = useMediaQuery('(max-width: 639px)')
  const isTablet  = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return { isMobile, isTablet, isDesktop }
}
