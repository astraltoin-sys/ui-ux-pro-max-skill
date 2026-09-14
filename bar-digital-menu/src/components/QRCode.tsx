import { useState, useEffect } from "react";
import QRCode from "qrcode";

export function QRCodeSVG({ value, size = 200 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState("");

  useEffect(() => {
    QRCode.toString(value, { type: "svg", margin: 0, width: size, height: size })
      .then(setSvg)
      .catch(console.error);
  }, [value, size]);

  return <div dangerouslySetInnerHTML={{ __html: svg }} style={{ width: size, height: size }} />;
}
