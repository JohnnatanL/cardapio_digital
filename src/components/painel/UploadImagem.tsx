"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Trash2, LoaderCircle } from "lucide-react";
import { criarClienteBrowser } from "@/lib/supabase/client";

/**
 * Envio de foto do prato — opcional em todo lugar.
 *
 * A compressão acontece no navegador antes de subir, e isso não é otimização
 * prematura: dono de restaurante fotografa com o próprio celular e manda um
 * HEIC/JPEG de 5 MB. Sem tratar, o upload trava no 4G do salão, o bucket enche
 * e o cardápio fica pesado para o cliente.
 *
 * Resultado típico: 5 MB -> ~90 KB em WebP 1200px.
 */

const LADO_MAXIMO = 1200;
const QUALIDADE = 0.82;

export function UploadImagem({
  valorAtual, restaurantId, pasta = "itens", onChange, rotulo = "Foto do prato",
}: {
  valorAtual: string | null;
  restaurantId: string;
  pasta?: string;
  onChange: (url: string | null) => void;
  rotulo?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function selecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setErro(null);
    setEnviando(true);

    try {
      const blob = await comprimir(arquivo);
      const supabase = criarClienteBrowser();
      const caminho = `${restaurantId}/${pasta}/${crypto.randomUUID()}.webp`;

      const { error } = await supabase.storage
        .from("menu-images")
        .upload(caminho, blob, { contentType: "image/webp", upsert: false });

      if (error) throw error;

      const { data } = supabase.storage.from("menu-images").getPublicUrl(caminho);
      onChange(data.publicUrl);
    } catch (falha: any) {
      setErro(
        falha?.message?.includes("exceeded")
          ? "A imagem ficou grande demais mesmo depois de comprimir. Tente outra foto."
          : "Não foi possível enviar a imagem. Tente de novo.",
      );
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="eyebrow">{rotulo}</p>
      <p className="mt-1 text-[0.75rem] text-[var(--color-fumaca)]">
        Opcional. Pratos sem foto aparecem normalmente no cardápio, só em formato
        de lista.
      </p>

      <div className="mt-2.5 flex items-center gap-3">
        {valorAtual ? (
          <div className="relative h-20 w-20 flex-none overflow-hidden rounded-[4px] border border-[var(--color-risco)]">
            <Image src={valorAtual} alt="" fill className="object-cover" sizes="80px" />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={enviando}
            className="flex h-20 w-20 flex-none flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed border-[var(--color-risco)] text-[var(--color-fumaca)] hover:border-[var(--color-tinta)] hover:text-[var(--color-tinta)]"
          >
            {enviando ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
                <span className="text-[0.625rem]">Adicionar</span>
              </>
            )}
          </button>
        )}

        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={enviando}
            className="btn btn-fantasma !py-1.5 text-[0.8125rem]"
          >
            {enviando ? "Enviando…" : valorAtual ? "Trocar foto" : "Escolher foto"}
          </button>

          {valorAtual && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="inline-flex items-center gap-1.5 text-[0.75rem]"
              style={{ color: "var(--color-brasa)" }}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remover foto
            </button>
          )}
        </div>
      </div>

      {erro && (
        <p role="alert" className="mt-2 text-[0.75rem]" style={{ color: "var(--color-brasa)" }}>
          {erro}
        </p>
      )}

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture={undefined}
        className="sr-only"
        onChange={selecionar}
      />
    </div>
  );
}

/**
 * Redimensiona e converte para WebP no canvas.
 * Recorta no centro em quadrado: a lista do cardápio usa miniatura 1:1, e
 * deixar o navegador esticar a foto distorce o prato.
 */
async function comprimir(arquivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);

  const lado = Math.min(bitmap.width, bitmap.height);
  const origemX = (bitmap.width - lado) / 2;
  const origemY = (bitmap.height - lado) / 2;
  const destino = Math.min(lado, LADO_MAXIMO);

  const canvas = document.createElement("canvas");
  canvas.width = destino;
  canvas.height = destino;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, origemX, origemY, lado, lado, 0, 0, destino, destino);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALIDADE),
  );
  if (!blob) throw new Error("falha ao converter");
  return blob;
}
