import { useState, useEffect } from "react";
import QRCode from "qrcode";

export function QRCodeSVG({ value, size = 200 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 1, width: size })
      .then(setSvg)
      .catch(console.error);
  }, [value, size]);

  return (
    <div
      className="flex items-center justify-center overflow-hidden"
      dangerouslySetInnerHTML={{ __html: svg }}
      style={{ width: size, height: size }}
    />
  );
}
