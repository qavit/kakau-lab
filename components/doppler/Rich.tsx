"use client";

import { Fragment } from "react";
import { Tex } from "@/components/math/MathJax";

/**
 * Plain text with inline maths: segments between `$` … `$` are typeset, the rest is text. Keeps every
 * formula in the copy as real LaTeX (so it is typeset, and read as maths) without JSX in the copy file.
 */
export default function Rich({ children, dynamic = false }: { children: string; dynamic?: boolean }) {
  const parts = children.split("$");
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>{index % 2 === 1 ? <Tex dynamic={dynamic}>{part}</Tex> : part}</Fragment>
      ))}
    </>
  );
}
