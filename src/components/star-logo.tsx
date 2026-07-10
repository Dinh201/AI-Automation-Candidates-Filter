import Image from "next/image";

export function StarLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/vacons-logo.png"
      alt="Vacons"
      height={size}
      width={Math.round(size * 2.7)}
      style={{ display: "block", flexShrink: 0, objectFit: "contain" }}
      priority
    />
  );
}