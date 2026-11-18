import React, { useEffect, useId, useRef, useState } from 'react';
import { Box, FileText, Image as ImageIcon, Upload, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Área de envio de arquivos (adaptada do "File Upload" da extend-hq), no design da SunLab:
 * - Caixa tracejada com três "cartinhas" de tipo de arquivo (modelo 3D, foto, PDF) em leque;
 *   no hover/foco elas se abrem e, arrastando um arquivo por cima, se abrem mais e uma luz
 *   âmbar/azul corre pela borda (classe .beam-border no index.css).
 * - Lista compacta dos arquivos escolhidos, com miniatura para fotos, tamanho e botão de remover.
 * - Acessível: a área é um <button> (Enter/Espaço abre o seletor); o input real fica escondido
 *   mas ligado ao rótulo; erros aparecem em role="alert". "Reduzir movimento": sem animação.
 * - Os arquivos ficam só no navegador: quem usa decide o que fazer com eles (aqui, a página
 *   lista os nomes para a pessoa anexar no WhatsApp).
 */

export type PickedFile = { id: string; file: File; preview?: string };

interface FileDropzoneProps {
  files: PickedFile[];
  onChange: (files: PickedFile[]) => void;
  /** Extensões aceitas, ex.: ['.stl', '.png'] */
  accept: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  label: string;
  hint?: string;
}

const MODEL_EXT = ['.stl', '.obj', '.step', '.stp', '.3mf', '.zip'];
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.heic'];

const extOf = (name: string) => name.slice(name.lastIndexOf('.')).toLowerCase();
const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

const iconFor = (name: string) => (MODEL_EXT.includes(extOf(name)) ? Box : IMAGE_EXT.includes(extOf(name)) ? ImageIcon : FileText);

export const FileDropzone: React.FC<FileDropzoneProps> = ({ files, onChange, accept, maxSizeMB = 50, maxFiles = 10, label, hint }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  // Libera as miniaturas da memória ao sair.
  useEffect(() => () => files.forEach(f => f.preview && URL.revokeObjectURL(f.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const rejected: string[] = [];
    const ok: PickedFile[] = [];
    for (const file of incoming) {
      if (!accept.includes(extOf(file.name))) { rejected.push(`${file.name} (formato não aceito)`); continue; }
      if (file.size > maxSizeMB * 1024 * 1024) { rejected.push(`${file.name} (maior que ${maxSizeMB} MB)`); continue; }
      ok.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file,
        preview: IMAGE_EXT.includes(extOf(file.name)) && extOf(file.name) !== '.heic' ? URL.createObjectURL(file) : undefined
      });
    }
    const merged = [...files, ...ok.filter(n => !files.some(f => f.id === n.id))].slice(0, maxFiles);
    if (files.length + ok.length > maxFiles) rejected.push(`limite de ${maxFiles} arquivos`);
    setError(rejected.length ? `Não deu para adicionar: ${rejected.join(', ')}.` : null);
    onChange(merged);
  };

  const remove = (fid: string) => {
    const f = files.find(x => x.id === fid);
    if (f?.preview) URL.revokeObjectURL(f.preview);
    onChange(files.filter(x => x.id !== fid));
  };

  // Três posições por cartinha: parada, hover/foco (abre um pouco) e arrastando (abre mais).
  const cards = [
    { Icon: Box, rest: 'translate(-78%,-50%) rotate(-8deg)', hover: 'translate(-96%,-52%) rotate(-11deg)', open: 'translate(-118%,-58%) rotate(-15deg)' },
    { Icon: ImageIcon, rest: 'translate(-50%,-50%) rotate(0deg)', hover: 'translate(-50%,-58%) rotate(0deg)', open: 'translate(-50%,-68%) rotate(0deg)' },
    { Icon: FileText, rest: 'translate(-22%,-50%) rotate(8deg)', hover: 'translate(-4%,-52%) rotate(11deg)', open: 'translate(18%,-58%) rotate(15deg)' }
  ];

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={id} className="text-sm font-medium leading-5 text-zinc-800">{label}</label>

      <div className={cn('beam-border rounded-[20px]', dragging && 'is-active')}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          aria-describedby={`${id}-hint`}
          className={cn(
            'group relative flex min-h-64 w-full cursor-pointer flex-col items-center justify-center gap-5 rounded-[20px] border border-dashed px-6 py-10 text-center transition-colors duration-200',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A2540]',
            dragging ? 'border-amber-500 bg-amber-50' : 'border-zinc-300 bg-white hover:border-[#0A2540]/40 hover:bg-[#F6F1E7]/60'
          )}
        >
          {/* Cartinhas em leque: abrem no hover/foco e mais ainda arrastando */}
          <span aria-hidden="true" className="relative h-16 w-40">
            {cards.map(({ Icon, rest, hover, open }, i) => (
              <span
                key={i}
                className={cn(
                  'absolute left-1/2 top-1/2 grid h-12 w-12 place-items-center rounded-xl bg-white text-zinc-600 shadow-[0_4px_12px_-4px_rgba(10,37,64,0.24)] ring-1 ring-zinc-200 transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
                  '[transform:var(--rest)] group-hover:[transform:var(--hover)] group-focus-visible:[transform:var(--hover)]',
                  i === 1 && 'z-10',
                  dragging && '!bg-[#0A2540] !text-amber-300 !ring-[#0A2540] ![transform:var(--open)]'
                )}
                style={{ '--rest': rest, '--hover': hover, '--open': open } as React.CSSProperties}
              >
                <Icon className="h-5 w-5" />
              </span>
            ))}
          </span>

          <span className="flex flex-col gap-1">
            <span className="text-base font-semibold leading-6 text-zinc-900">
              {dragging ? 'Solte os arquivos aqui' : 'Clique para enviar ou arraste os arquivos'}
            </span>
            <span id={`${id}-hint`} className="text-sm leading-5 text-zinc-600">
              {hint ?? `${accept.join(', ').toUpperCase().replace(/\./g, '')} · até ${maxSizeMB} MB cada`}
            </span>
          </span>

          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-[#0A2540] px-4 text-sm font-semibold leading-5 text-white transition-colors group-hover:bg-[#0F3A66]">
            <Upload aria-hidden="true" className="h-4 w-4 text-amber-300" />
            Escolher arquivos
          </span>
        </button>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        multiple
        accept={accept.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
      />

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm leading-5 text-rose-900 ring-1 ring-inset ring-rose-200">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul aria-label="Arquivos escolhidos" className="flex flex-col gap-2">
          {files.map(f => {
            const Icon = iconFor(f.file.name);
            return (
              <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-white p-2 pr-2 ring-1 ring-inset ring-zinc-200">
                {f.preview ? (
                  <img src={f.preview} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#F6F1E7] text-[#0A2540]">
                    <Icon className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium leading-5 text-zinc-900">{f.file.name}</span>
                  <span className="block text-xs leading-4 text-zinc-600">{formatSize(f.file.size)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  aria-label={`Remover ${f.file.name}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-[#0A2540] cursor-pointer"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileDropzone;
