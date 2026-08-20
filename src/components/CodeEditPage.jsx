import { useEffect, useRef, useState } from 'react';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import { Save, X, Copy, Eye, Pencil, Minus, Plus } from 'lucide-react';
import MarkdownIt from 'markdown-it';
import betterMd from '@/md-plugins/better-md';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
}).use(betterMd);

const FONT_SCALE_STEP = 10;
const FONT_SCALE_MIN = 30;
const FONT_SCALE_MAX = 250;
const FONT_SCALE_DEFAULT = 100;

const getFontScaleKey = (remotePath) => `webdav-viewer-font-scale:${remotePath}`;

function MarkdownPreview({ content }) {
  const html = md.render(content || '');
  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}



function MediaPreview({ url, type, fileName }) {
  if (!url) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-500">
        미리보기를 준비하는 중...
      </div>
    );
  }

  if (type === 'image') {
    return (
      <div className="flex h-full items-center justify-center overflow-auto bg-gray-100 p-4">
        <img src={url} alt={fileName} className="max-h-full max-w-full h-full w-full object-contain" />
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 p-6">
        <p className="max-w-full truncate text-sm text-gray-600">{fileName}</p>
        <audio key={url} src={url} controls className="w-full max-w-xl" />
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div className="flex h-full items-center justify-center bg-black p-4">
        <video key={url} src={url} controls playsInline className="max-h-full max-w-full w-full h-full" />
      </div>
    );
  }

  if (type === 'pdf') {
    return (
      <iframe
        key={url}
        src={url}
        title={fileName}
        className="h-full w-full border-0 bg-gray-100"
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-500">
      이 파일은 미리볼 수 없습니다.
    </div>
  );
}

export default function CodeEditPage({
  selectedFile,
  editorContent,
  editorLoading,
  hasEditorChanges,
  explorerWidth,
  mediaPreviewUrl,
  mediaPreviewType,
  onContentChange,
  onCopy,
  onSave,
  onClose,
}) {
  const editorContainerRef = useRef(null);
  const codeMirrorRef = useRef(null);
  const [markdownPreviewPath, setMarkdownPreviewPath] = useState('');
  const [fontScale, setFontScale] = useState(() => {
    const remotePath = selectedFile?.remotePath;
    if (!remotePath) return FONT_SCALE_DEFAULT;

    const savedScale = Number(localStorage.getItem(getFontScaleKey(remotePath)));
    return Number.isFinite(savedScale) ? savedScale : FONT_SCALE_DEFAULT;
  });
  const fontScaleValue = fontScale / 100;
  const isMediaView = selectedFile?.viewMode === 'media';
  const isMarkdownFile = !isMediaView && /\.md$/i.test(selectedFile?.remotePath || '');
  const isMarkdownView = isMarkdownFile && markdownPreviewPath === selectedFile?.remotePath;

  useEffect(() => {
    const remotePath = selectedFile?.remotePath;
    if (!remotePath) return;

    localStorage.setItem(getFontScaleKey(remotePath), String(fontScale));
  }, [fontScale, selectedFile?.remotePath]);

  useEffect(() => {
    const remotePath = selectedFile?.remotePath;
    if (!remotePath) {
      setTimeout(() => setFontScale(FONT_SCALE_DEFAULT), 0);
      return;
    }

    const savedScale = Number(localStorage.getItem(getFontScaleKey(remotePath)));
    setTimeout(() => setFontScale(Number.isFinite(savedScale) ? savedScale : FONT_SCALE_DEFAULT), 0);
  }, [selectedFile?.remotePath]);

  useEffect(() => {
    if (isMediaView || !selectedFile || !editorContainerRef.current) return;

    editorContainerRef.current.innerHTML = '';
    const editor = CodeMirror(editorContainerRef.current, {
      value: editorContent,
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 2,
      tabSize: 2,
      extraKeys: {
        'Ctrl-S': () => onSave(),
        'Cmd-S': () => onSave(),
      },
    });

    editor.setSize('100%', '100%');
    editor.on('change', (instance) => {
      onContentChange(instance.getValue());
    });
    codeMirrorRef.current = editor;

    setTimeout(() => editor.refresh(), 0);
    return () => {
      codeMirrorRef.current = null;
    };
  }, [selectedFile?.remotePath, isMediaView]);

  useEffect(() => {
    const editor = codeMirrorRef.current;
    if (editor && editor.getValue() !== editorContent) {
      editor.setValue(editorContent);
    }
  }, [editorContent]);

  useEffect(() => {
    if (isMarkdownView) return;
    const editor = codeMirrorRef.current;
    if (!editor) return;
    setTimeout(() => editor.refresh(), 0);
  }, [isMarkdownView]);

  return (
    <div
      className="flex min-h-0 max-h-[calc(100vh-180px)] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      style={{
        flexBasis: `${100 - explorerWidth}%`,
        '--editor-font-scale': fontScaleValue,
      }}
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-sm text-gray-700">
            {hasEditorChanges && <span className="mr-1 font-bold text-red-600">*</span>}
            {selectedFile.remotePath}
          </div>
        </div>
        <div className="flex items-center overflow-hidden rounded-md border border-gray-200 bg-white text-sm text-gray-700">
          <button
            type="button"
            onClick={() => setFontScale((scale) => Math.max(FONT_SCALE_MIN, scale - FONT_SCALE_STEP))}
            className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            title="글자 크기 줄이기"
          >
            <Minus size={16} />
          </button>
          <button
            type="button"
            onClick={()=>setFontScale(Number(prompt('글자 크기를 입력하세요. (%)', fontScale)) || FONT_SCALE_DEFAULT)}
            onDoubleClick={() => setFontScale(FONT_SCALE_DEFAULT)}
            className="min-w-14 border-x border-gray-200 px-3 py-1 text-center font-mono text-xs hover:bg-gray-50"
            title="기본 글자 크기"
          >
            {fontScale}%
          </button>
          <button
            type="button"
            onClick={() => setFontScale((scale) => Math.min(FONT_SCALE_MAX, scale + FONT_SCALE_STEP))}
            className="flex h-8 w-8 items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            title="글자 크기 늘리기"
          >
            <Plus size={16} />
          </button>
        </div>
        {isMarkdownFile && (
          <button
            onClick={() => {
              setMarkdownPreviewPath((path) =>
                path === selectedFile.remotePath ? '' : selectedFile.remotePath
              );
            }}
            className={`rounded p-1.5 ${
              isMarkdownView
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
            }`}
            title={isMarkdownView ? '편집' : '미리보기'}
          >
            {isMarkdownView ? <Pencil size={18} /> : <Eye size={18} />}
          </button>
        )}
        {!isMediaView && (
          <button
            onClick={onSave}
            disabled={editorLoading || !hasEditorChanges}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-40"
            title="저장"
          >
            <Save size={18} />
          </button>
        )}
        <button
          onClick={onClose}
          disabled={editorLoading}
          className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-40"
          title="닫기"
        >
          <X size={18} />
        </button>
        {!isMediaView && (
          <button
            onClick={onCopy}
            disabled={editorLoading}
            className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-40"
            title="파일 내용 복사"
          >
            <Copy size={18} />
          </button>
        )}
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {editorLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm text-gray-600">
            불러오는 중...
          </div>
        )}
        {isMediaView ? (
          <MediaPreview
            url={mediaPreviewUrl}
            type={mediaPreviewType}
            fileName={selectedFile.name}
          />
        ) : (
          <>
            <div
              ref={editorContainerRef}
              className={`h-full text-sm ${isMarkdownView ? 'hidden' : ''}`}
            />
            {isMarkdownView && <MarkdownPreview content={editorContent} />}
          </>
        )}
      </div>
    </div>
  );
}
