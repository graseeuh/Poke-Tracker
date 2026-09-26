const BALL_COUNT = 9

// Deterministic spread (not Math.random) so the layout doesn't jump around
// on every re-render, just varied enough that the balls don't line up.
const BALLS = Array.from({ length: BALL_COUNT }, (_, i) => ({
  left: (i * 23 + 7) % 100,
  size: 18 + ((i * 11) % 22),
  duration: 24 + ((i * 7) % 20),
  delay: -((i * 5) % 30),
}))

// Purely decorative, site-wide loop behind all page content. Pure CSS pixel
// art (no external image assets), so there's no license/asset dependency.
export default function PixelBallField() {
  return (
    <div className="pixel-ball-field" aria-hidden="true">
      {BALLS.map((b, i) => (
        <span
          key={i}
          className="pixel-ball"
          style={{
            left: `${b.left}%`,
            width: b.size,
            height: b.size,
            animationDuration: `${b.duration}s`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
