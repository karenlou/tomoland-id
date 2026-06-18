// Pixel art heart matching the Figma card icon (#FF769B)
const GRID = [
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
]

const COLS = GRID[0].length
const ROWS = GRID.length

export default function PixelHeart({
  className,
  color = '#FF769B',
}: {
  className?: string
  color?: string
}) {
  return (
    <svg
      width={COLS * 6}
      height={ROWS * 6}
      viewBox={`0 0 ${COLS * 6} ${ROWS * 6}`}
      className={className}
      aria-hidden
    >
      {GRID.flatMap((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * 6}
              y={r * 6}
              width={6}
              height={6}
              fill={color}
            />
          ) : null,
        ),
      )}
    </svg>
  )
}
