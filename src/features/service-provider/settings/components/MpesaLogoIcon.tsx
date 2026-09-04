const MPESA_LOGO_SRC = '/partners/mpesa-logo.png'

export function MpesaLogoIcon({ height = 22 }: { height?: number }) {
  return (
    <img
      src={MPESA_LOGO_SRC}
      alt="M-Pesa"
      style={{
        height,
        width: 'auto',
        display: 'block',
        borderRadius: 4,
        objectFit: 'contain',
      }}
    />
  )
}
