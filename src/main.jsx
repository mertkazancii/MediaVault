import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Archive, Bookmark, ChevronDown, ChevronRight, File, Folder, FolderOpen, Heart, Image as ImageIcon, MoreHorizontal, Play, Plus, Search, Settings, Tag, Trash2, X, Check, Move, ExternalLink, FolderInput, Video, SlidersHorizontal, Palette, PanelRight, Clock3, HardDrive, Film, CircleDot, Star, Copy, Pencil, ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Info, Clipboard, BookmarkPlus, Inbox, ArchiveRestore } from "lucide-react";
import "./styles.css";

const demoItems = [
  { id:"demo-1", name:"Mountain reference", type:"image", extension:".jpg", favorite:false, tags:["reference","wallpaper"], folder_id:null, demo:true },
  { id:"demo-2", name:"UI inspiration", type:"image", extension:".png", favorite:true, tags:["ui","reference"], folder_id:null, demo:true },
  { id:"demo-3", name:"Gameplay clip", type:"video", extension:".mp4", favorite:false, tags:["games"], folder_id:null, demo:true },
  { id:"demo-4", name:"Dark texture", type:"image", extension:".jpg", favorite:false, tags:["wallpaper"], folder_id:null, demo:true },
  { id:"demo-5", name:"Character sheet", type:"image", extension:".png", favorite:false, tags:["games","reference"], folder_id:null, demo:true }
];

const demoGradients = [
  "linear-gradient(135deg,#2a2d35,#6b7280)",
  "linear-gradient(135deg,#1e293b,#7c3aed)",
  "linear-gradient(135deg,#0f172a,#0ea5e9)",
  "linear-gradient(135deg,#312e81,#f97316)",
  "linear-gradient(135deg,#064e3b,#14b8a6)"
];

const itemColors = [
  {name:"None", value:null, css:"transparent"},
  {name:"Red", value:"#ef4444", css:"#ef4444"},
  {name:"Orange", value:"#f97316", css:"#f97316"},
  {name:"Yellow", value:"#eab308", css:"#eab308"},
  {name:"Green", value:"#22c55e", css:"#22c55e"},
  {name:"Cyan", value:"#06b6d4", css:"#06b6d4"},
  {name:"Blue", value:"#3b82f6", css:"#3b82f6"},
  {name:"Purple", value:"#8b5cf6", css:"#8b5cf6"},
  {name:"Pink", value:"#ec4899", css:"#ec4899"}
];
const tagColors = [
  {name:"None", value:null, css:"transparent"},
  {name:"Red", value:"#ef4444", css:"#ef4444"},
  {name:"Orange", value:"#f97316", css:"#f97316"},
  {name:"Yellow", value:"#eab308", css:"#eab308"},
  {name:"Green", value:"#22c55e", css:"#22c55e"},
  {name:"Cyan", value:"#06b6d4", css:"#06b6d4"},
  {name:"Blue", value:"#3b82f6", css:"#3b82f6"},
  {name:"Purple", value:"#8b5cf6", css:"#8b5cf6"},
  {name:"Pink", value:"#ec4899", css:"#ec4899"}
];
const folderColors = [
  {name:"None", value:null, css:"transparent"},
  {name:"Red", value:"#ef4444", css:"#ef4444"},
  {name:"Orange", value:"#f97316", css:"#f97316"},
  {name:"Yellow", value:"#eab308", css:"#eab308"},
  {name:"Green", value:"#22c55e", css:"#22c55e"},
  {name:"Cyan", value:"#06b6d4", css:"#06b6d4"},
  {name:"Blue", value:"#3b82f6", css:"#3b82f6"},
  {name:"Purple", value:"#8b5cf6", css:"#8b5cf6"},
  {name:"Pink", value:"#ec4899", css:"#ec4899"}
];


function fileUrl(p) {
  if (!p) return "";
  return encodeURI("file:///" + p.replace(/\\/g, "/").replace(/^\/+/, ""));
}

function bytes(n) {
  if (!n) return "";
  const units=["B","KB","MB","GB"];
  let i=0, v=n;
  while(v>=1024 && i<units.length-1){v/=1024;i++;}
  return `${v.toFixed(v>=10||i===0?0:1)} ${units[i]}`;
}

function FolderTree({ folders, current, setCurrent, onAdd, onRename, onDelete, onDropItems, onDropExternalFiles, dragOverFolder, setDragOverFolder, onMenu }) {
  const [open, setOpen] = useState({});
  const children = parent => folders.filter(f => (f.parentId || null) === parent);
  const node = (folder, depth=0) => {
    const kids = children(folder.id);
    const isOpen = open[folder.id];
    return <React.Fragment key={folder.id}>
      <div className={`side-row folder-drop-row ${current===`folder:${folder.id}`?"active":""} ${dragOverFolder===folder.id?"drop-target":""}`} style={{paddingLeft: 12+depth*14}}
        onDragEnter={e=>{
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolder(folder.id);
        }}
        onDragOver={e=>{
          e.preventDefault();
          e.stopPropagation();
          const isExternal=Array.from(e.dataTransfer.types||[]).includes("Files");
          e.dataTransfer.dropEffect=isExternal ? "copy" : "move";
          if(dragOverFolder!==folder.id) setDragOverFolder(folder.id);
        }}
        onDragLeave={e=>{
          if(!e.currentTarget.contains(e.relatedTarget)) setDragOverFolder(null);
        }}
        onDrop={async e=>{
          e.preventDefault();
          e.stopPropagation();

          // First handle an internal MediaVault drag (move existing items).
          const custom=e.dataTransfer.getData("application/x-mediavault-item");
          const plain=e.dataTransfer.getData("text/plain");
          const payload=custom || plain;

          if(payload){
            let ids=[];
            try{
              const parsed=JSON.parse(payload);
              ids=Array.isArray(parsed)?parsed:[];
            }catch{}
            if(!ids.length) ids=[payload];
            if(ids.length) onDropItems(ids,folder.id);
          } else if(e.dataTransfer.files?.length){
            // Otherwise this is an OS/Desktop file drag: import the files
            // directly into the folder that is currently being hovered.
            const paths=[];
            for(const file of [...e.dataTransfer.files]){
              const p=window.mediaVault.getDroppedFilePath(file);
              if(p) paths.push(p);
            }
            if(paths.length) await onDropExternalFiles?.(paths,folder.id);
          }

          setDragOverFolder(null);
        }}
        onClick={()=>setCurrent(`folder:${folder.id}`)} onContextMenu={e=>{e.preventDefault();e.stopPropagation();onMenu?.(e,folder)}}>
        {kids.length ? <button className="tiny-btn tree-toggle" title={isOpen?"Collapse":"Expand"} onClick={e=>{e.stopPropagation();setOpen(o=>({...o,[folder.id]:!isOpen}))}}>{isOpen?<ChevronDown size={14}/>:<ChevronRight size={14}/>}</button> : <span className="tree-spacer"/>}
        <Folder size={15} style={{color:folder.color || undefined}}/><span className="side-label folder-name" style={{color:folder.color || undefined}}>{folder.name}</span>{folder.color && <span className="folder-color-dot" style={{background:folder.color}} title="Folder color" />}
        <span className="row-actions folder-actions">
          <button className="tiny-btn" title="Folder options" onClick={e=>{e.preventDefault();e.stopPropagation();onMenu(e,folder)}}><MoreHorizontal size={15}/></button>
        </span>
      </div>
      {isOpen && kids.map(f=>node(f,depth+1))}
    </React.Fragment>;
  };
  return <div className="folder-tree">
    <div className="section-head"><span>FOLDERS</span><button className="tiny-btn" title="New folder" onClick={()=>onAdd(null)}><Plus size={14}/></button></div>
    {children(null).map(f=>node(f))}{!folders.length && <div className="empty-side">No folders yet</div>}
  </div>;
}

function useLazyVisible(ref, rootMargin="650px"){
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const el=ref.current;
    if(!el) return;
    if(!("IntersectionObserver" in window)){
      setVisible(true);
      return;
    }
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){
        setVisible(true);
        observer.disconnect();
      }
    },{root:null,rootMargin,threshold:0.01});
    observer.observe(el);
    return ()=>observer.disconnect();
  },[ref,rootMargin]);
  return visible;
}

function ImageThumb({ path, className="" }) {
  const hostRef=useRef(null);
  const shouldLoad=useLazyVisible(hostRef);
  const [src,setSrc]=useState("");
  useEffect(()=>{
    if(!shouldLoad || !path) return;
    let alive=true;
    window.mediaVault.getThumbnailDataUrl(path).then(data=>{
      if(alive && data) setSrc(data);
    });
    return ()=>{alive=false};
  },[path,shouldLoad]);
  return <div ref={hostRef} className={`lazy-thumb ${className}`}>
    {src
      ? <img className="thumb-media" src={src} loading="lazy" decoding="async" />
      : <div className="asset-loading"><ImageIcon size={28}/><span>{shouldLoad?"Generating thumbnail…":"Loading when visible…"}</span></div>}
  </div>;
}


function VideoThumb({ path, className="" }) {
  const hostRef=useRef(null);
  const videoRef=useRef(null);
  const shouldLoad=useLazyVisible(hostRef);
  const [src,setSrc]=useState("");
  const [fallback,setFallback]=useState(false);

  useEffect(()=>{
    if(!shouldLoad || !path) return;
    let alive=true;
    window.mediaVault.getThumbnailDataUrl(path).then(data=>{
      if(alive && data) setSrc(data);
      else if(alive) setFallback(true);
    });
    return ()=>{alive=false};
  },[path,shouldLoad]);

  useEffect(()=>{
    if(!shouldLoad || src || fallback) return;
    const v=videoRef.current;
    if(!v) return;
    const capture=()=>{
      try{
        const canvas=document.createElement("canvas");
        const w=v.videoWidth||640, h=v.videoHeight||360;
        const scale=Math.min(1,700/w,520/h);
        canvas.width=Math.max(1,Math.round(w*scale));
        canvas.height=Math.max(1,Math.round(h*scale));
        const ctx=canvas.getContext("2d");
        ctx.drawImage(v,0,0,canvas.width,canvas.height);
        const data=canvas.toDataURL("image/jpeg",0.82);
        window.mediaVault.saveVideoThumbnail(path,data).then(saved=>{
          if(saved) window.mediaVault.getThumbnailDataUrl(path).then(x=>x&&setSrc(x));
        });
      }catch{
        setFallback(true);
      }
    };
    const seek=()=>{
      try{v.currentTime=Math.min(1.5,Math.max(0.1,(v.duration||2)*0.15));}
      catch{setFallback(true);}
    };
    v.addEventListener("loadedmetadata",seek,{once:true});
    v.addEventListener("seeked",capture,{once:true});
    v.addEventListener("error",()=>setFallback(true),{once:true});
    return ()=>{
      v.removeEventListener("loadedmetadata",seek);
      v.removeEventListener("seeked",capture);
    };
  },[path,src,fallback,shouldLoad]);

  return <div ref={hostRef} className={`lazy-thumb ${className}`}>
    {src
      ? <img className="thumb-media" src={src} loading="lazy" decoding="async" />
      : fallback
        ? <div className="file-thumb"><Play size={34}/><span>VIDEO</span></div>
        : shouldLoad
          ? <video ref={videoRef} className="thumbnail-generator" src={fileUrl(path)} muted playsInline preload="metadata"/>
          : <div className="asset-loading"><Video size={28}/><span>Loading when visible…</span></div>}
  </div>;
}


const Card = React.memo(function Card({ item, selected, onClick, onOpen, onFavorite, onContextMenu, onDragStart, onDragEnd, onDropTag, onDropFiles }) {
  const [nativeDropOver,setNativeDropOver]=useState(false);
  return <div className={`card ${selected?"selected":""} ${item.color?"has-color":""} ${nativeDropOver?"native-drop-target":""} card-${item.type}`} style={item.color?{"--item-color":item.color}:undefined} draggable={!item.demo}
    onDragStart={e=>{if(!item.demo){
      e.dataTransfer.effectAllowed="move";
      onDragStart?.(item.id,e);
      const selectionIds = selected.includes(item.id)
        ? selected.filter(x=>!String(x).startsWith("demo-"))
        : [item.id];
      const payload = JSON.stringify(selectionIds);
      e.dataTransfer.setData("application/x-mediavault-item",payload);
      e.dataTransfer.setData("text/plain",payload);
    }}}
    onDragEnd={()=>onDragEnd?.()}
    onClick={onClick} onDoubleClick={()=>onOpen(item)}
    onDragEnter={e=>{
      if(!item.demo && (e.dataTransfer.types.includes("Files") || e.dataTransfer.files?.length)){
        e.preventDefault();
        e.stopPropagation();
        setNativeDropOver(true);
      }
    }}
    onDragOver={e=>{
      const hasFiles=e.dataTransfer.types.includes("Files") || e.dataTransfer.files?.length;
      const hasTag=e.dataTransfer.types.includes("application/x-mediavault-tag");
      if(hasFiles){
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect="copy";
        if(!nativeDropOver) setNativeDropOver(true);
      } else if(hasTag){
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect="copy";
      }
    }}
    onDragLeave={e=>{
      if(!e.currentTarget.contains(e.relatedTarget)) setNativeDropOver(false);
    }}
    onDrop={async e=>{
      e.preventDefault();
      e.stopPropagation();
      setNativeDropOver(false);
      const tag=e.dataTransfer.getData("application/x-mediavault-tag");
      if(tag){
        onDropTag?.(item,tag);
        return;
      }
      const internal=e.dataTransfer.getData("application/x-mediavault-item");
      if(internal) return;
      const files=[...e.dataTransfer.files];
      if(files.length && !item.demo) onDropFiles?.(item,files);
    }}
    onContextMenu={e=>{e.preventDefault();e.stopPropagation();onContextMenu(e,item)}}>
    <div className="thumb">
      {item.demo ? <div className="demo-thumb" style={{background:demoGradients[demoItems.findIndex(x=>x.id===item.id)%demoGradients.length]}}>
        {item.type==="video" && <Play className="demo-play" size={32}/>}
      </div> :
      item.type==="image" ? <ImageThumb path={item.stored_path} /> :
      item.type==="video" ? <VideoThumb path={item.stored_path} /> :
      <div className="file-thumb"><File size={42}/><span>{item.extension?.replace(".","").toUpperCase()}</span></div>}
      {item.color && <span className="item-color-dot" style={{background:item.color}} title="Colored item"/>}
      <button className="card-more" title="More" onClick={e=>{e.stopPropagation();onContextMenu(e,item)}}><MoreHorizontal size={17}/></button>
      <button className={`fav-btn ${item.favorite?"on":""}`} onClick={e=>{e.stopPropagation();onFavorite(item.id)}}><Heart size={16} fill={item.favorite?"currentColor":"none"}/></button>
      {selected && <div className="selected-check"><Check size={14}/></div>}
    </div>
    <div className="card-info">
      <div className="card-name" title={item.name} style={item.color?{color:item.color}:undefined}>{item.name}</div>
      <div className="card-meta">
        <span>{item.type}</span>
        {item.size ? <span>{bytes(item.size)}</span> : null}
      </div>
      {!!item.tags?.length && <div className="card-tags">{item.tags.slice(0,3).map(t=><span key={t}>#{t}</span>)}</div>}
    </div>
  </div>
});

class AppErrorBoundary extends React.Component {
  constructor(props){
    super(props);
    this.state={hasError:false};
  }
  static getDerivedStateFromError(){ return {hasError:true}; }
  componentDidCatch(error){ console.error("MediaVault render error:",error); }
  render(){
    if(!this.state.hasError) return this.props.children;
    return <div className="fatal-error">
      <div className="fatal-error-card">
        <Archive size={32}/>
        <h2>MediaVault ran into an error</h2>
        <p>The current screen could not be rendered. Your library files were not deleted by this screen error.</p>
        <button className="small-btn" onClick={()=>window.location.reload()}><RotateCw size={14}/> Restart MediaVault</button>
      </div>
    </div>;
  }
}

function Modal({ children, onClose, wide=false }) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className={`modal ${wide?"wide":""}`}>{children}</div>
  </div>
}

function App() {
  const [db,setDb]=useState({items:[],folders:[],tags:[],collections:[]});
  const [view,setView]=useState("all");
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState([]);
  const [preview,setPreview]=useState(null);
  const [viewerZoom,setViewerZoom]=useState(1);
  const [viewerRotation,setViewerRotation]=useState(0);
  const [viewerFullscreen,setViewerFullscreen]=useState(false);
  const [viewerMetadata,setViewerMetadata]=useState(null);
  const viewerRef=useRef(null);
  const [grid,setGrid]=useState(()=>Number(localStorage.getItem("mediavault.gridSize"))||230);
  const [viewMode,setViewMode]=useState(()=>localStorage.getItem("mediavault.viewMode")||"grid");
  const [folderModal,setFolderModal]=useState(null);
  const [tagModal,setTagModal]=useState(null);
  const [createDialog,setCreateDialog]=useState(null);
  const [createName,setCreateName]=useState("");
  const [tagEditor,setTagEditor]=useState(null);
  const [bulkMenu,setBulkMenu]=useState(null);
  const [showInspector,setShowInspector]=useState(false);
  const [inspectorData,setInspectorData]=useState(null);
  const [contextMenu,setContextMenu]=useState(null);
  const [contextPosition,setContextPosition]=useState({left:0,top:0});
  const contextMenuRef=useRef(null);
  const [folderMenu,setFolderMenu]=useState(null);
  const [collectionMenu,setCollectionMenu]=useState(null);
  const [collectionPicker,setCollectionPicker]=useState(null);
  const [savedSearchMenu,setSavedSearchMenu]=useState(null);
  const [draggedId,setDraggedId]=useState(null);
  const [dragOverFolder,setDragOverFolder]=useState(null);
  const [metadata,setMetadata]=useState(null);
  const [infoDialog,setInfoDialog]=useState(null);
  const [infoNotes,setInfoNotes]=useState("");
  const [infoSourceUrl,setInfoSourceUrl]=useState("");
  const [toast,setToast]=useState(null);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [statsOpen,setStatsOpen]=useState(false);
  const [backupBusy,setBackupBusy]=useState(false);
  const [confirmDelete,setConfirmDelete]=useState(()=>localStorage.getItem("mediavault.confirmDelete") !== "false");
  const [showDropHint,setShowDropHint]=useState(()=>localStorage.getItem("mediavault.showDropHint") !== "false");
  const [renameDialog,setRenameDialog]=useState(null);
  const [renameName,setRenameName]=useState("");
  const [batchRenameOpen,setBatchRenameOpen]=useState(false);
  const [batchRenamePattern,setBatchRenamePattern]=useState("{name}_{n}");
  const [batchRenameStart,setBatchRenameStart]=useState(1);
  const [batchRenamePreview,setBatchRenamePreview]=useState([]);
  const [folderAction,setFolderAction]=useState(null);
  const [inboxOrganizer,setInboxOrganizer]=useState(null);
  const [inboxFolderMode,setInboxFolderMode]=useState("keep");
  const [inboxFolderId,setInboxFolderId]=useState("");
  const [inboxCollectionId,setInboxCollectionId]=useState("");
  const [inboxTags,setInboxTags]=useState("");
  const [inboxColorMode,setInboxColorMode]=useState("keep");
  const [inboxColor,setInboxColor]=useState(null);
  const [duplicateSort,setDuplicateSort]=useState("oldest");
  const fileRef=useRef(null);
  const searchRef=useRef(null);

  const refresh=async()=>{
    try{
      const next=await window.mediaVault.getState();
      setDb(next||{items:[],folders:[],tags:[],collections:[],saved_searches:[]});
    }catch{
      notify("MediaVault could not load the library. Check the library folder and restart the app.");
    }
  };
  function notify(message){
    setToast(message);
    window.clearTimeout(window.__mediaVaultToast);
    window.__mediaVaultToast=window.setTimeout(()=>setToast(null),2200);
  }
  useEffect(()=>{refresh();},[]);
  async function warmThumbnails(){
    const media=db.items.filter(x=>x.type==="image"||x.type==="video");
    for(const item of media){
      if(item.type==="image") await window.mediaVault.getThumbnailDataUrl(item.stored_path);
    }
    notify("Thumbnail cache prepared.");
  }

  useEffect(()=>{ localStorage.setItem("mediavault.gridSize",String(grid)); },[grid]);
  useEffect(()=>{ localStorage.setItem("mediavault.viewMode",viewMode); },[viewMode]);
  useEffect(()=>{ localStorage.setItem("mediavault.confirmDelete",String(confirmDelete)); },[confirmDelete]);
  useEffect(()=>{ localStorage.setItem("mediavault.showDropHint",String(showDropHint)); },[showDropHint]);

  function parseSize(value){
    const m=String(value||"").trim().toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb|tb)?$/);
    if(!m) return null;
    const units={b:1,kb:1024,mb:1024**2,gb:1024**3,tb:1024**4};
    return Number(m[1])*(units[m[2]||"b"]||1);
  }
  function sizeMatches(size,expr){
    if(!expr||!Number.isFinite(size)) return false;
    const range=expr.split("-");
    if(range.length===2){const a=parseSize(range[0]),b=parseSize(range[1]);return a!==null&&b!==null&&size>=Math.min(a,b)&&size<=Math.max(a,b);}
    const m=expr.match(/^(>=|<=|>|<|=)?(.+)$/); if(!m)return false;
    const target=parseSize(m[2]); if(target===null)return false;
    switch(m[1]||"="){case ">":return size>target;case ">=":return size>=target;case "<":return size<target;case "<=":return size<=target;default:return Math.abs(size-target)<1;}
  }
  function dateMatches(value,expr){
    if(!value)return false;
    const d=new Date(value),now=Date.now(),v=String(expr||"").toLowerCase();
    if(v==="today")return d.toDateString()===new Date().toDateString();
    const m=v.match(/^(\d+)d$/); if(m)return now-d.getTime()<=Number(m[1])*86400000;
    return false;
  }
  const colorAliases={red:"#ef4444",orange:"#f97316",yellow:"#eab308",green:"#22c55e",cyan:"#06b6d4",blue:"#3b82f6",purple:"#8b5cf6",pink:"#ec4899",none:"none"};




  const allItems = db.items;
  const activeFolder = view.startsWith("folder:") ? view.slice(7) : null;
  const activeTag = view.startsWith("tag:") ? view.slice(4) : null;
  const activeCollection = view.startsWith("collection:") ? view.slice(11) : null;

  const filtered=useMemo(()=>{
    const raw=search.trim().toLowerCase();
    const tokens=raw ? raw.match(/(?:"[^"]+"|\S+)/g)?.map(x=>x.replace(/^"|"$/g,"")) || [] : [];
    const structured={tag:[],type:[],folder:[],ext:[],color:[],size:[],created:[],modified:[],note:[],source:[]}; let favoriteFilter=null; const free=[];
    for(const token of tokens){
      const m=token.match(/^(tag|type|folder|ext|color|favorite|size|created|modified|note|source):(.+)$/i);
      if(m){const key=m[1].toLowerCase(),val=m[2].toLowerCase();if(key==='favorite') favoriteFilter=['true','yes','1','on'].includes(val); else structured[key].push(val.replace(/^#/,''));}
      else if(token.startsWith('#')) structured.tag.push(token.slice(1)); else free.push(token);
    }
    return allItems.filter(item=>{
      if(view==="smart:recent"){const age=Date.now()-new Date(item.created_at||0).getTime();if(!item.created_at||age>7*24*60*60*1000)return false;}
      if(view==="smart:favorites"&&!item.favorite)return false;
      if(view==="smart:images"&&item.type!=="image")return false;
      if(view==="smart:videos"&&item.type!=="video")return false;
      if(view==="smart:large"&&(!item.size||item.size<100*1024*1024))return false;
      if(view==="inbox"&&!item.inbox) return false;
      if(view==="favorites"&&!item.favorite) return false; if(activeFolder&&item.folder_id!==activeFolder) return false; if(activeTag&&!item.tags?.includes(activeTag)) return false;
      if(activeCollection&&!(item.collection_ids||[]).includes(activeCollection)) return false;
      if(view==="images"&&item.type!=="image") return false; if(view==="videos"&&item.type!=="video") return false;
      if(view==="recent"){const age=Date.now()-new Date(item.created_at||0).getTime();if(!item.created_at||age>7*24*60*60*1000)return false;}
      if(view==="large"&&(!item.size||item.size<100*1024*1024))return false;
      if(favoriteFilter!==null&&item.favorite!==favoriteFilter)return false;
      if(structured.type.length&&!structured.type.some(x=>{const t=x.replace(/s$/,'');return (t==='photo'||t==='picture')?item.type==='image':(t==='movie'||t==='clip')?item.type==='video':t===item.type;}))return false;
      if(structured.ext.length&&!structured.ext.some(x=>x.split(',').some(ext=>item.extension?.replace(/^\./,'').toLowerCase()===ext.replace(/^\./,''))))return false;
      if(structured.color.length&&!structured.color.some(x=>(colorAliases[x]||x)===(item.color||'none').toLowerCase()))return false;
      if(structured.size.length&&!structured.size.every(x=>sizeMatches(Number(item.size||0),x)))return false;
      if(structured.created.length&&!structured.created.every(x=>dateMatches(item.created_at,x)))return false;
      if(structured.modified.length&&!structured.modified.every(x=>dateMatches(item.modified_at,x)))return false;
      if(structured.tag.length&&!structured.tag.every(t=>item.tags?.some(x=>x.toLowerCase().includes(t))))return false;
      if(structured.folder.length){const folder=db.folders.find(f=>structured.folder.some(q=>f.name.toLowerCase().includes(q)));if(!folder||item.folder_id!==folder.id)return false;}
      if(structured.note.length&&!structured.note.every(q=>String(item.notes||"").toLowerCase().includes(q)))return false;
      if(structured.source.length&&!structured.source.every(q=>String(item.source_url||"").toLowerCase().includes(q)))return false;
      if(free.length){
        const hay=[item.name,...(item.tags||[]),item.notes||"",item.source_url||""].join(" ").toLowerCase();
        if(!free.every(q=>hay.includes(q)))return false;
      }
      return true;
    });
  },[allItems,view,search,activeFolder,activeTag,activeCollection,db.folders]);

  const emptyState = useMemo(()=>{
    if(search.trim()) return {
      icon:"search",
      title:"No results found",
      text:"Try a different name, tag, operator or filter."
    };
    if(view==="favorites") return {icon:"heart",title:"No favorites yet",text:"Mark an item as a favorite to see it here."};
    if(view==="inbox") return {icon:"inbox",title:"Inbox is empty",text:"Import files here first, then organize them when you are ready."};
    if(view==="recent") return {icon:"clock",title:"Nothing recently added",text:"Newly imported items will appear here."};
    if(view==="large") return {icon:"harddrive",title:"No large files",text:"Large files will appear here based on your library contents."};
    if(view==="images") return {icon:"image",title:"No images yet",text:"Import an image to start building your library."};
    if(view==="videos") return {icon:"video",title:"No videos yet",text:"Import a video to start building your library."};
    if(db.items.length===0 && view==="all") return {
      icon:"archive",
      title:"Welcome to MediaVault",
      text:"Your library is empty. Import files, paste a copied image, or drag files into this window to get started.",
      firstRun:true
    };
    return {icon:"archive",title:"No media here",text:"Import files or change the current filter."};
  },[search,view,db.items.length]);

  const title = view==="inbox"?"Inbox":view==="all"?"All Items":view==="favorites"?"Favorites":view==="images"?"Images":view==="videos"?"Videos":view==="recent"?"Recently added":view==="large"?"Large files":view==="duplicates"?"Duplicates":view==="smart:recent"?"Recently Added":view==="smart:favorites"?"Favorites":view==="smart:images"?"All Images":view==="smart:videos"?"All Videos":view==="smart:large"?"Large Files":
    activeFolder ? (db.folders.find(f=>f.id===activeFolder)?.name||"Folder") :
    activeTag ? `#${activeTag}` :
    activeCollection ? (db.collections.find(c=>c.id===activeCollection)?.name||"Collection") : "MediaVault";

  const realFiltered=filtered.filter(x=>!x.demo);
  const isAllSelected=filtered.length>0 && filtered.every(x=>selected.includes(x.id));

  const duplicateGroups=useMemo(()=>{
    const groups=new Map();
    for(const item of db.items){
      if(!item.content_hash) continue;
      const hash=String(item.content_hash);
      if(!groups.has(hash)) groups.set(hash,[]);
      groups.get(hash).push(item);
    }
    const rows=[...groups.entries()]
      .filter(([,items])=>items.length>1)
      .map(([hash,items])=>{
        const ordered=[...items].sort((a,b)=>{
          if(duplicateSort==="newest"){
            return new Date(b.created_at||0)-new Date(a.created_at||0);
          }
          if(duplicateSort==="largest"){
            return Number(b.size||0)-Number(a.size||0);
          }
          return new Date(a.created_at||0)-new Date(b.created_at||0);
        });
        const extra=ordered.slice(1);
        const itemSize=Number(ordered[0]?.size||0);
        return {
          hash,
          items:ordered,
          extra,
          extraCount:extra.length,
          wastedBytes:itemSize*extra.length
        };
      })
      .sort((a,b)=>{
        if(b.extraCount!==a.extraCount) return b.extraCount-a.extraCount;
        return b.wastedBytes-a.wastedBytes;
      });
    return rows;
  },[db.items,duplicateSort]);

  const duplicateExtraCount=duplicateGroups.reduce((sum,g)=>sum+g.extraCount,0);
  const duplicateWastedBytes=duplicateGroups.reduce((sum,g)=>sum+g.wastedBytes,0);


  async function pasteClipboard(){
    const result=await window.mediaVault.pasteClipboard(activeFolder || null, view==="inbox");
    if(result?.ok){
      setDb(result.state);
      const count=result?.imported?.length||0;
      if(count) notify(`${count} item${count===1?"":"s"} pasted from clipboard.`);
      else notify("No new items imported. Duplicates were skipped.");
    }else if(result?.message){
      notify(result.message);
    }
  }

  function saveCurrentSearch(){
    const query=search.trim();
    if(!query) return;
    setCreateName("");
    setCreateDialog({type:"saved-search",query});
  }

  function openSavedSearch(saved){
    setSavedSearchMenu(null);
    setSearch(saved.query);
    setView("all");
    setSelected([]);
  }

  function renameSavedSearch(saved){
    setSavedSearchMenu(null);
    setRenameName(saved.name);
    setRenameDialog({type:"saved-search",id:saved.id,oldName:saved.name});
  }

  async function deleteSavedSearch(saved){
    if(!saved) return;
    if(confirm(`Delete saved search "${saved.name}"?`)){
      setDb(await window.mediaVault.deleteSavedSearch(saved.id));
      setSavedSearchMenu(null);
    }
  }

  async function toggleFavoriteSelection(){
    const ids=selected.filter(id=>db.items.some(item=>item.id===id));
    if(!ids.length) return;
    const items=ids.map(id=>db.items.find(item=>item.id===id)).filter(Boolean);
    const nextFavorite=!items.every(item=>item.favorite);
    setDb(await window.mediaVault.setItemFavorite(ids,nextFavorite));
    notify(nextFavorite ? `Added ${ids.length} item(s) to favorites.` : `Removed ${ids.length} item(s) from favorites.`);
  }


  function openInboxOrganizer(){
    const inboxIds=selected.filter(id=>db.items.some(item=>item.id===id && item.inbox));
    if(!inboxIds.length) return;
    setInboxFolderMode("keep");
    setInboxFolderId("");
    setInboxCollectionId("");
    setInboxTags("");
    setInboxColorMode("keep");
    setInboxColor(null);
    setInboxOrganizer({ids:inboxIds});
  }

  async function submitInboxOrganizer(){
    if(!inboxOrganizer?.ids?.length) return;
    const tags = inboxTags.split(",").map(v=>v.trim()).filter(Boolean);
    const result=await window.mediaVault.organizeInbox(inboxOrganizer.ids,{
      folderMode:inboxFolderMode,
      folderId:inboxFolderId || null,
      collectionId:inboxCollectionId || "",
      tagsToAdd:tags,
      colorMode:inboxColorMode,
      color:inboxColor,
      archive:true
    });
    if(result?.ok){
      setDb(result.state);
      setSelected([]);
      setInboxOrganizer(null);
      notify(`${inboxOrganizer.ids.length} item(s) organized and archived.`);
    }else{
      notify(result?.message || "Inbox organization failed.");
    }
  }

  async function sendSelectedToInbox(){
    if(!selected.length) return;
    setDb(await window.mediaVault.setItemsInbox(selected,true));
    notify(`${selected.length} item(s) moved to Inbox.`);
  }

  async function archiveSelectedFromInbox(){
    const ids=selected.filter(id=>db.items.some(item=>item.id===id && item.inbox));
    if(!ids.length) return;
    setDb(await window.mediaVault.setItemsInbox(ids,false));
    setSelected(s=>s.filter(id=>!ids.includes(id)));
    notify(`${ids.length} item(s) archived.`);
  }

  async function importExternalPaths(paths, targetFolderId){
    if(!paths?.length) return null;
    const result=await window.mediaVault.importFiles(paths,targetFolderId||null,false);
    setDb(result.state);
    const count=result?.imported?.length||0;
    if(count) notify(`${count} file${count===1?"":"s"} imported to folder.`);
    else notify("No new files imported. Duplicates were skipped.");
    return result;
  }

  async function importPaths(paths, targetFolderId=activeFolder){
    if(!paths?.length) return null;
    const r=await window.mediaVault.importFiles(paths, targetFolderId, view==="inbox");
    setDb(r.state);
    if(!r.imported?.length){
      const existing = (r.state?.items || []).length;
      if(paths.length && existing){
        // Duplicates are intentionally ignored; no error dialog is needed.
      }
    }
    return r;
  }

  async function dropFilesOnItem(item, files){
    if(!item || item.demo || !files?.length) return;
    const paths=[];
    for(const file of files){
      const p=window.mediaVault.getDroppedFilePath(file);
      if(p) paths.push(p);
    }
    if(!paths.length) return;
    const result=await importPaths(paths,item.folder_id || null);
    const count=result?.imported?.length||0;
    if(count) notify(`${count} file${count===1?"":"s"} imported.`);
    else notify("No new files imported. Duplicates were skipped.");
  }

  async function handleDrop(e){
    e.preventDefault();
    e.stopPropagation();
    // Card-to-folder moves use a text payload, not OS files.
    if(e.dataTransfer.types.includes("text/plain")) return;
    const paths=[];
    for(const file of [...e.dataTransfer.files]){
      const p=window.mediaVault.getDroppedFilePath(file);
      if(p) paths.push(p);
    }
    await importPaths(paths);
  }

  function selectDuplicateExtras(){
    const ids=duplicateGroups.flatMap(g=>g.extra.map(item=>item.id));
    setSelected(ids);
    setShowInspector(ids.length>0);
  }

  function clearDuplicateSelection(){
    setSelected([]);
    setShowInspector(false);
  }

  function selectCard(item,e){
    if(item.demo) return;
    setShowInspector(true);
    const id=item.id;
    if(e.ctrlKey||e.metaKey) setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
    else if(e.shiftKey && selected.length){
      const ids=filtered.filter(x=>!x.demo).map(x=>x.id);
      const a=ids.indexOf(selected[selected.length-1]), b=ids.indexOf(id);
      if(a>=0&&b>=0){
        const [lo,hi]=a<b?[a,b]:[b,a];
        setSelected([...new Set([...selected,...ids.slice(lo,hi+1)])]);
      }
    } else setSelected([id]);
  }

  async function openMetadata(item){
    if(!item || item.demo) return;
    const data=await window.mediaVault.getItemMetadata(item.stored_path);
    setMetadata({item,data});
  }

  function openInfoEditor(item){
    if(!item || item.demo) return;
    setInfoNotes(item.notes||"");
    setInfoSourceUrl(item.source_url||"");
    setInfoDialog({itemId:item.id,name:item.name});
    setContextMenu(null);
  }

  async function saveInfoEditor(){
    if(!infoDialog) return;
    const result=await window.mediaVault.updateItemInfo(infoDialog.itemId,infoNotes,infoSourceUrl);
    if(result?.ok){
      setDb(result.state);
      const updated=result.state.items.find(x=>x.id===infoDialog.itemId);
      if(updated){
        setPreview(p=>p?.id===updated.id?updated:p);
        setMetadata(m=>m?.item.id===updated.id?{...m,item:updated}:m);
      }
      setInfoDialog(null);
      notify("Item info saved.");
    }else{
      notify(result?.message||"Could not save item info.");
    }
  }

  async function toggleFav(id){
    if(!id) return;
    setDb(await window.mediaVault.toggleFavorite(id));
  }

  async function setColor(ids,color){ if(!ids?.length)return; setDb(await window.mediaVault.setItemColor(ids,color)); setBulkMenu(null); notify(color?`${ids.length} item(s) colored.`:`Color removed from ${ids.length} item(s).`); }
  async function setFolderColor(folderId,color){ if(!folderId)return; setDb(await window.mediaVault.setFolderColor(folderId,color)); setFolderMenu(null); notify(color?`Folder colored.`:`Folder color removed.`); }
  async function setTagColor(tagId,color){ if(!tagId)return; setDb(await window.mediaVault.setTagColor(tagId,color)); setTagEditor(null); notify(color?`Tag colored.`:`Tag color removed.`); }

  useEffect(()=>{
    const item=selected.length===1?db.items.find(x=>x.id===selected[0]):null;
    if(!item){setInspectorData(null);return;}
    window.mediaVault.getItemMetadata(item.stored_path).then(setInspectorData);
  },[selected,db.items]);

  async function deleteSelected(){
    if(!selected.length) return;
    if(confirmDelete && !confirm(`Delete ${selected.length} item(s) from MediaVault?`)) return;
    const ids=[...selected];
    const result=await window.mediaVault.deleteItems(ids);
    setDb(result.state);
    setSelected([]);
    if(result.ok && result.undoable) notify(`${ids.length} item(s) deleted. Press Ctrl+Z to undo.`);
    else if(result.message) notify(result.message);
  }

  async function undoDelete(){
    const result=await window.mediaVault.undoDelete();
    if(result?.ok){
      setDb(result.state);
      setSelected(result.restored?.map(item=>item.id)||[]);
      setShowInspector((result.restored?.length||0)>0);
      notify(`${result.restored?.length||0} deleted item(s) restored.`);
    }else if(result?.message){
      notify(result.message);
    }
  }

  async function backupLibrary(){
    if(backupBusy) return;
    setBackupBusy(true);
    try{
      const result=await window.mediaVault.createBackup();
      if(result?.ok) notify(`Backup created: ${result.name}`);
      else notify(result?.message || "Backup could not be created.");
    }catch{
      notify("Backup could not be created.");
    }finally{
      setBackupBusy(false);
    }
  }

  async function restoreBackup(){
    if(backupBusy) return;
    const folder=await window.mediaVault.chooseBackupFolder();
    if(!folder) return;
    const backupName=String(folder).split(/[\\/]/).filter(Boolean).pop() || "selected backup";
    if(!confirm(`Restore "${backupName}"? Your current MediaVault library will be replaced. A safety backup will be created automatically before restore.`)) return;
    setBackupBusy(true);
    try{
      const result=await window.mediaVault.restoreBackup(folder);
      if(result?.ok){
        setDb(result.state);
        setSelected([]);
        setPreview(null);
        setView("all");
        setShowInspector(false);
        notify(`Backup restored. ${result.itemCount||0} items available.`);
      }else{
        notify(result?.message || "Backup could not be restored.");
      }
    }catch{
      notify("Backup could not be restored.");
    }finally{
      setBackupBusy(false);
    }
  }

  async function openBackupsFolder(){
    await window.mediaVault.openBackupsFolder();
  }

  async function moveSelected(folderId){
    setDb(await window.mediaVault.moveItems(selected,folderId)); setSelected([]); setBulkMenu(null);
  }

  async function moveSelectedToFolder(ids, folderId){
    const moving = ids?.length ? ids : selected;
    if(!moving.length) return;
    setDb(await window.mediaVault.moveItems(moving,folderId));
    setSelected(s=>s.filter(id=>!moving.includes(id)));
  }

  function openFolderAction(mode, ids){
    const moving=[...(ids||[])].filter(id=>db.items.some(x=>x.id===id));
    if(!moving.length) return;
    setBulkMenu(null);
    setContextMenu(null);
    setFolderAction({mode,ids:moving});
  }

  async function submitFolderAction(folderId){
    if(!folderAction?.ids?.length) return;
    if(folderAction.mode==="copy") {
      const result=await window.mediaVault.copyItems(folderAction.ids,folderId);
      setDb(result.state);
      notify(`${result.copied?.length||0} item(s) copied.`);
    } else {
      setDb(await window.mediaVault.moveItems(folderAction.ids,folderId));
      setSelected(s=>s.filter(id=>!folderAction.ids.includes(id)));
      notify(`${folderAction.ids.length} item(s) moved.`);
    }
    setFolderAction(null);
  }

  async function dropTagOnItem(item,tag){
    if(!item || item.demo) return;
    const ids=selected.includes(item.id) ? selected : [item.id];
    const result=await window.mediaVault.bulkUpdateTags(ids,[tag],[]);
    setDb(result);
    notify(`Added #${tag} to ${ids.length} item(s).`);
  }

  function createCollection(){
    setCreateName("");
    setCreateDialog({type:"collection"});
  }

  async function addToCollection(ids, collectionId){
    const moving=[...(ids||[])].filter(id=>db.items.some(x=>x.id===id));
    if(!moving.length || !collectionId) return;
    const result=await window.mediaVault.updateItemCollections(moving,collectionId,true);
    setDb(result);
    setCollectionMenu(null);
    notify(`Added ${moving.length} item${moving.length===1?"":"s"} to collection.`);
  }

  async function removeFromCollection(ids, collectionId){
    const moving=[...(ids||[])].filter(id=>db.items.some(x=>x.id===id));
    if(!moving.length || !collectionId) return;
    const result=await window.mediaVault.updateItemCollections(moving,collectionId,false);
    setDb(result);
    setCollectionMenu(null);
    notify(`Removed ${moving.length} item${moving.length===1?"":"s"} from collection.`);
  }

  function openCollectionPicker(ids){
    const valid=(ids||[]).filter(id=>db.items.some(x=>x.id===id));
    if(!valid.length) return;
    setContextMenu(null);
    setBulkMenu(null);
    setCollectionPicker({ids:valid});
  }

  async function toggleCollectionForSelection(collectionId){
    if(!collectionPicker?.ids?.length || !collectionId) return;
    const items=collectionPicker.ids.map(id=>db.items.find(x=>x.id===id)).filter(Boolean);
    const everyHas=items.length>0 && items.every(item=>(item.collection_ids||[]).includes(collectionId));
    setDb(await window.mediaVault.updateItemCollections(collectionPicker.ids,collectionId,!everyHas));
  }

  async function dropItemsToCollection(ids, collectionId){
    if(!collectionId) return;
    const moving=(ids||[]).filter(id=>db.items.some(x=>x.id===id));
    if(!moving.length) return;
    setDb(await window.mediaVault.updateItemCollections(moving,collectionId,true));
    setSelected(s=>s.filter(id=>!moving.includes(id)));
    notify(`Added ${moving.length} item${moving.length===1?"":"s"} to collection.`);
  }

  function createFolder(parentId=null){
    setCreateName("");
    setCreateDialog({type:"folder",parentId:parentId||null});
  }

  async function submitCreate(){
    const name=createName.trim();
    if(!name) return;
    if(createDialog?.type==="folder") {
      const result=await window.mediaVault.createFolder(name,createDialog.parentId);
      setDb(result.state);
      notify(result.ok ? `Folder "${name}" created.` : (result.message || "Folder could not be created."));
    } else if(createDialog?.type==="tag") {
      const result=await window.mediaVault.createTag(name);
      setDb(result.state);
      notify(result.ok ? `#${name.replace(/^#+/,"")} created.` : (result.message || "Tag could not be created."));
    } else if(createDialog?.type==="collection") {
      const result=await window.mediaVault.createCollection(name);
      setDb(result.state);
      notify(result.ok ? `Collection "${name}" created.` : (result.message || "Collection could not be created."));
    } else if(createDialog?.type==="saved-search") {
      const result=await window.mediaVault.createSavedSearch(name,createDialog.query);
      setDb(result.state);
      notify(result.ok ? `Saved search "${name}" created.` : (result.message || "Saved search could not be created."));
    }
    setCreateDialog(null);
    setCreateName("");
  }

  async function renameFolder(f){
    setRenameName(f.name);
    setRenameDialog({type:"folder", id:f.id, oldName:f.name});
  }

  function renameItem(item){
    if(!item || item.demo) return;
    setRenameName(item.name);
    setContextMenu(null);
    setRenameDialog({type:"item", id:item.id, oldName:item.name});
  }


  function buildBatchRenamePreview(pattern=batchRenamePattern,start=batchRenameStart){
    const items=selected.map(id=>db.items.find(x=>x.id===id)).filter(Boolean);
    return items.map((item,index)=>{
      const ext=item.extension || "";
      const base=item.name?.slice(0, item.name.length-ext.length) || item.name || "";
      const date=item.modified_at ? new Date(item.modified_at) : null;
      let name=String(pattern||"{name}_{n}");
      name=name.replace(/\{name\}/gi,base);
      name=name.replace(/\{ext\}/gi,ext.replace(/^\./,""));
      name=name.replace(/\{n\}/gi,String(Number(start)||1 + index));
      name=name.replace(/\{counter\}/gi,String(Number(start)||1 + index));
      name=name.replace(/\{index\}/gi,String(index+1));
      name=name.replace(/\{year\}/gi,date && !Number.isNaN(date.getTime()) ? String(date.getFullYear()) : "");
      name=name.replace(/\{month\}/gi,date && !Number.isNaN(date.getTime()) ? String(date.getMonth()+1).padStart(2,"0") : "");
      name=name.replace(/\{day\}/gi,date && !Number.isNaN(date.getTime()) ? String(date.getDate()).padStart(2,"0") : "");
      if(!/\.[A-Za-z0-9]{1,8}$/.test(name) && ext) name += ext;
      return {id:item.id,old:item.name,new:name};
    });
  }

  function openBatchRename(){
    if(!selected.length) return;
    setBatchRenamePattern("{name}_{n}");
    setBatchRenameStart(1);
    setBatchRenamePreview(buildBatchRenamePreview("{name}_{n}",1));
    setBatchRenameOpen(true);
    setBulkMenu(null);
  }

  async function submitBatchRename(){
    const ids=selected.filter(id=>db.items.some(x=>x.id===id));
    if(!ids.length) return;
    const preview=buildBatchRenamePreview(batchRenamePattern,batchRenameStart);
    if(!preview.length) return;

    const duplicateNames=new Map();
    for(const p of preview){
      const key=p.new.toLowerCase();
      duplicateNames.set(key,(duplicateNames.get(key)||0)+1);
    }
    const repeated=[...duplicateNames.entries()].filter(([,n])=>n>1);
    if(repeated.length){
      notify("Some generated names are duplicated. Change the pattern.");
      return;
    }

    const result=await window.mediaVault.batchRenameItems(
      preview.map(x=>({id:x.id,name:x.new}))
    );
    setDb(result.state);
    if(result.ok){
      notify(`${result.renamed?.length||0} item(s) renamed.`);
      setSelected(result.renamed?.map(x=>x.id)||[]);
      setBatchRenameOpen(false);
    } else {
      notify(result.message || "Batch rename could not be completed.");
    }
  }

  useEffect(()=>{
    if(batchRenameOpen){
      setBatchRenamePreview(buildBatchRenamePreview(batchRenamePattern,batchRenameStart));
    }
  },[batchRenamePattern,batchRenameStart,batchRenameOpen,selected,db.items]);

  async function submitRename(){
    const name=renameName.trim();
    if(!name || !renameDialog) return;
    if(renameDialog.type==="folder") setDb(await window.mediaVault.renameFolder(renameDialog.id,name));
    else if(renameDialog.type==="collection") {
      setDb(await window.mediaVault.renameCollection(renameDialog.id,name));
      setCollectionMenu(null);
    } else if(renameDialog.type==="saved-search") {
      setDb(await window.mediaVault.renameSavedSearch(renameDialog.id,name));
    } else {
      const result=await window.mediaVault.renameItem(renameDialog.id,name);
      setDb(result.state);
      if(result.ok) notify(`Renamed to "${result.item.name}".`);
      else notify(result.message || "File could not be renamed.");
    }
    setRenameDialog(null);
    setRenameName("");
  }

  function renameCollection(c){
    setRenameName(c.name);
    setCollectionMenu(null);
    setRenameDialog({type:"collection", id:c.id, oldName:c.name});
  }

  async function deleteCollection(c){
    if(!c) return;
    if(confirm(`Delete collection "${c.name}"? Items will stay in the library and their files will not be deleted.`)){
      setDb(await window.mediaVault.deleteCollection(c.id));
      if(view===`collection:${c.id}`){
        setView("all");
        setSelected([]);
      }
      setCollectionMenu(null);
    }
  }

  async function deleteFolder(){
    if(!folderModal) return;
    if(confirm(`Delete "${folderModal.name}"? Items will stay in the parent folder.`)){
      setDb(await window.mediaVault.deleteFolder(folderModal.id));
      setFolderModal(null);
    }
  }

  function createTag(){
    setCreateName("");
    setCreateDialog({type:"tag"});
  }

  async function saveTagEdit(){
    if(!tagEditor) return;
    const value=tagEditor.value.trim().replace(/^#/,"");
    if(value) {
      let next=await window.mediaVault.renameTag(tagEditor.id,value);
      next=await window.mediaVault.setTagColor(tagEditor.id,tagEditor.color||null);
      setDb(next);
    }
    setTagEditor(null);
  }

  async function addBulkTag(){
    const name=prompt("Tag to add:");
    if(name?.trim()) {
      setDb(await window.mediaVault.bulkUpdateTags(selected,[name.trim().replace(/^#/,"")],[]));
      setBulkMenu(null);
      notify(`Tag added to ${selected.length} item(s).`);
    }
  }
  async function removeBulkTag(){
    const name=prompt("Tag to remove:");
    if(name?.trim()) {
      setDb(await window.mediaVault.bulkUpdateTags(selected,[],[name.trim().replace(/^#/,"")]));
      setBulkMenu(null);
      notify(`Tag removed from ${selected.length} item(s).`);
    }
  }

  async function addItemTag(item,tag){
    const tags=[...new Set([...(item.tags||[]),tag])];
    setDb(await window.mediaVault.updateItemTags(item.id,tags));
  }
  function handleContextMenu(e,item){
    e.preventDefault();
    e.stopPropagation();
    if(!item.demo && !selected.includes(item.id)) setSelected([item.id]);
    setContextPosition({left:e.clientX,top:e.clientY});
    setContextMenu({x:e.clientX,y:e.clientY,item});
  }

  useEffect(()=>{
    if(!contextMenu || !contextMenuRef.current) return;
    const rect=contextMenuRef.current.getBoundingClientRect();
    const gap=8;
    let left=contextMenu.x;
    let top=contextMenu.y;

    if(left + rect.width > window.innerWidth - gap) left=window.innerWidth - rect.width - gap;
    if(left < gap) left=gap;

    // Prefer opening upward when the menu would overflow below the viewport.
    if(top + rect.height > window.innerHeight - gap){
      top=contextMenu.y - rect.height;
    }
    if(top < gap) top=gap;

    if(Math.abs(left-contextPosition.left)>0.5 || Math.abs(top-contextPosition.top)>0.5){
      setContextPosition({left,top});
    }
  },[contextMenu,contextPosition.left,contextPosition.top]);

  function closeContextMenu(){ setContextMenu(null); setFolderMenu(null); setBulkMenu(null); setSavedSearchMenu(null); }

  async function contextDelete(){
    const item=contextMenu?.item;
    if(!item || item.demo) return closeContextMenu();
    const ids=selected.includes(item.id) ? [...selected] : [item.id];
    if(!confirmDelete || confirm(`Delete ${ids.length} item(s) from MediaVault?`)){
      const result=await window.mediaVault.deleteItems(ids);
      setDb(result.state);
      setSelected(s=>s.filter(id=>!ids.includes(id)));
      if(result.ok && result.undoable) notify(`${ids.length} item(s) deleted. Press Ctrl+Z to undo.`);
      else if(result.message) notify(result.message);
    }
    closeContextMenu();
  }

  async function contextFavorite(){
    const item=contextMenu?.item;
    if(item) await toggleFav(item.id);
    closeContextMenu();
  }

  async function contextOpen(){
    const item=contextMenu?.item;
    if(item && !item.demo) await window.mediaVault.openFile(item.stored_path);
    closeContextMenu();
  }

  async function contextReveal(){
    const item=contextMenu?.item;
    if(item && !item.demo) await window.mediaVault.revealFile(item.stored_path);
    closeContextMenu();
  }

  const previewIndex=preview ? filtered.findIndex(x=>x.id===preview.id) : -1;
  function navigatePreview(direction){
    if(previewIndex<0 || !filtered.length) return;
    let next=previewIndex+direction;
    if(next<0) next=filtered.length-1;
    if(next>=filtered.length) next=0;
    setPreview(filtered[next]);
  }



  useEffect(()=>{
    setViewerZoom(1);
    setViewerRotation(0);
    setViewerMetadata(null);
    if(preview && !preview.demo && preview.stored_path){
      window.mediaVault.getItemMetadata(preview.stored_path).then(setViewerMetadata);
    }
  },[preview]);

  useEffect(()=>{
    const fn=()=>setViewerFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange",fn);
    return ()=>document.removeEventListener("fullscreenchange",fn);
  },[]);

  async function toggleViewerFullscreen(){
    try{
      if(document.fullscreenElement) await document.exitFullscreen();
      else if(viewerRef.current?.requestFullscreen) await viewerRef.current.requestFullscreen();
      else setViewerFullscreen(v=>!v);
    }catch{
      setViewerFullscreen(v=>!v);
    }
  }

  function updatePreviewFromState(state,id=preview?.id){
    if(!state || !id) return;
    const next=state.items.find(x=>x.id===id);
    if(next) setPreview(next);
  }

  async function viewerSetColor(color){
    if(!preview || preview.demo) return;
    const state=await window.mediaVault.setItemColor([preview.id],color);
    setDb(state);
    updatePreviewFromState(state);
    notify(color ? "Item color updated." : "Item color removed.");
  }

  async function viewerRemoveTag(tag){
    if(!preview || preview.demo) return;
    const state=await window.mediaVault.updateItemTags(preview.id,(preview.tags||[]).filter(t=>t!==tag));
    setDb(state);
    updatePreviewFromState(state);
  }

  async function viewerAddTag(tag){
    if(!preview || preview.demo || !tag) return;
    const state=await window.mediaVault.updateItemTags(preview.id,[...new Set([...(preview.tags||[]),tag])]);
    setDb(state);
    updatePreviewFromState(state);
  }

  async function viewerMoveFolder(folderId){
    if(!preview || preview.demo) return;
    const state=await window.mediaVault.moveItems([preview.id],folderId||null);
    setDb(state);
    updatePreviewFromState(state);
    notify(folderId ? "Item moved to folder." : "Item moved to Library root.");
  }

  useEffect(()=>{
    const fn=e=>{
      const isMod=e.ctrlKey||e.metaKey;
      const target=e.target;
      const isEditable=!!target && (
        target.matches?.("input,textarea,select") ||
        target.isContentEditable
      );

      if(isMod&&e.key.toLowerCase()==="k"){
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if(isMod&&e.key.toLowerCase()==="v" && !isEditable){
        e.preventDefault();
        pasteClipboard();
        return;
      }

      if(isMod&&e.key.toLowerCase()==="z" && !isEditable){
        e.preventDefault();
        undoDelete();
        return;
      }

      if(isMod&&e.shiftKey&&e.key.toLowerCase()==="f" && !isEditable){
        e.preventDefault();
        toggleFavoriteSelection();
        return;
      }

      if(isMod&&e.shiftKey&&e.key.toLowerCase()==="n" && !isEditable){
        e.preventDefault();
        createFolder(activeFolder||null);
        return;
      }

      if(isMod&&e.shiftKey&&e.key.toLowerCase()==="s" && !isEditable){
        e.preventDefault();
        saveCurrentSearch();
        return;
      }

      if(isEditable) return;

      if(e.key==="Delete" && selected.length){
        e.preventDefault();
        deleteSelected();
        return;
      }

      if(e.key==="F2" && selected.length){
        e.preventDefault();
        if(selected.length===1){
          const item=db.items.find(x=>x.id===selected[0]);
          if(item) renameItem(item);
        }else{
          openBatchRename();
        }
        return;
      }

      if((e.key===" " || e.key==="Enter") && selected.length===1 && !preview){
        e.preventDefault();
        const item=db.items.find(x=>x.id===selected[0]);
        if(item) setPreview(item);
        return;
      }

      if(preview){
        if(e.key==="ArrowLeft"){e.preventDefault();navigatePreview(-1);}
        if(e.key==="ArrowRight"){e.preventDefault();navigatePreview(1);}
        if(e.key==="Escape"){e.preventDefault();setPreview(null);}
        if(e.key==="+" || e.key==="="){e.preventDefault();setViewerZoom(z=>Math.min(3,Math.round((z+.1)*100)/100));}
        if(e.key==="-" || e.key==="_"){e.preventDefault();setViewerZoom(z=>Math.max(.25,Math.round((z-.1)*100)/100));}
        if(e.key==="0"){e.preventDefault();setViewerZoom(1);setViewerRotation(0);}
        if(e.key.toLowerCase()==="r"){e.preventDefault();setViewerRotation(r=>(r+90)%360);}
        if(e.key.toLowerCase()==="f"){e.preventDefault();toggleViewerFullscreen();}
      }

      if(isMod&&e.key.toLowerCase()==="a"){
        e.preventDefault();
        setSelected(filtered.filter(x=>!x.demo).map(x=>x.id));
      }
    };
    window.addEventListener("keydown",fn); return()=>window.removeEventListener("keydown",fn);
  },[preview,previewIndex,filtered,selected,db.items,activeFolder]);



  async function removeItemTag(item,tag){
    setDb(await window.mediaVault.updateItemTags(item.id,(item.tags||[]).filter(t=>t!==tag)));
  }

  return <div className="app" onDragOver={e=>e.preventDefault()} onDrop={handleDrop}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Archive size={18}/></div><span>MediaVault</span></div>
      <button className="import-btn" onClick={async()=>{const paths=await window.mediaVault.chooseImportFiles();await importPaths(paths)}}><Plus size={17}/> Import</button>
      <button className="inbox-import-btn" title="Import files directly into Inbox" onClick={async()=>{const paths=await window.mediaVault.chooseImportFiles();if(paths.length){const r=await window.mediaVault.importFiles(paths,null,true);setDb(r.state);notify(`${r.imported?.length||0} file(s) imported to Inbox.`)}}}><Inbox size={15}/> Import to Inbox</button>
      <input ref={fileRef} type="file" multiple hidden onChange={e=>{importPaths([...e.target.files].map(f=>f.path));e.target.value=""}}/>

      <nav className="nav">
        <button
          className={`nav-row ${view==="inbox"?"active":""}`}
          onClick={()=>{setView("inbox");setSelected([])}}
          onDragOver={e=>{if(e.dataTransfer.files?.length){e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect="copy";}}}
          onDrop={async e=>{
            e.preventDefault();e.stopPropagation();
            const paths=[...e.dataTransfer.files].map(file=>window.mediaVault.getDroppedFilePath(file)).filter(Boolean);
            if(paths.length){const r=await window.mediaVault.importFiles(paths,null,true);setDb(r.state);notify(`${r.imported?.length||0} file(s) imported to Inbox.`);}
          }}
        ><Inbox size={16}/><span>Inbox</span><b>{db.items.filter(item=>item.inbox).length}</b></button>
        <button className={`nav-row ${view==="all"?"active":""}`} onClick={()=>{setView("all");setSelected([])}}><Archive size={16}/><span>All Items</span><b>{db.items.length}</b></button>
        <button className={`nav-row ${view==="favorites"?"active":""}`} onClick={()=>{setView("favorites");setSelected([])}}><Heart size={16}/><span>Favorites</span></button>
        <button className={`nav-row ${view==="images"?"active":""}`} onClick={()=>setView("images")}><ImageIcon size={16}/><span>Images</span></button>
        <button className={`nav-row ${view==="videos"?"active":""}`} onClick={()=>setView("videos")}><Video size={16}/><span>Videos</span></button>
        <button className={`nav-row ${view==="recent"?"active":""}`} onClick={()=>{setView("recent");setSelected([])}}><Clock3 size={16}/><span>Recently added</span></button>
        <button className={`nav-row ${view==="large"?"active":""}`} onClick={()=>{setView("large");setSelected([])}}><HardDrive size={16}/><span>Large files</span></button>
        <button className={`nav-row ${view==="duplicates"?"active":""}`} onClick={()=>{setView("duplicates");setSelected([])}}><Copy size={16}/><span>Duplicates</span><b>{duplicateExtraCount}</b></button>
      </nav>

    <FolderTree folders={db.folders} current={view} setCurrent={v=>{setView(v);setSelected([])}} onAdd={createFolder}
        onRename={renameFolder} onDelete={f=>setFolderModal(f)}
        onDropItems={moveSelectedToFolder} onDropExternalFiles={importExternalPaths}
        dragOverFolder={dragOverFolder} setDragOverFolder={setDragOverFolder}
        onMenu={(e,folder)=>setFolderMenu({x:e.clientX,y:e.clientY,folder})}/>

      <div className="collections-section">
        <div className="section-head"><span>COLLECTIONS</span><button className="tiny-btn" title="New collection" onClick={createCollection}><Plus size={14}/></button></div>
        <div className="collection-list">
          {(db.collections||[]).map(c=>{
            const count=db.items.filter(item=>(item.collection_ids||[]).includes(c.id)).length;
            return <div
              key={c.id}
              className={`side-row collection-row ${view===`collection:${c.id}`?"active":""}`}
              onDragOver={e=>{
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect="copy";
              }}
              onDrop={e=>{
                e.preventDefault();
                e.stopPropagation();
                const custom=e.dataTransfer.getData("application/x-mediavault-item");
                const plain=e.dataTransfer.getData("text/plain");
                const payload=custom||plain;
                let ids=[];
                if(payload){
                  try{const parsed=JSON.parse(payload);ids=Array.isArray(parsed)?parsed:[payload]}catch{ids=[payload]}
                }
                dropItemsToCollection(ids,c.id);
              }}
              onClick={()=>{setView(`collection:${c.id}`);setSelected([])}}
              onContextMenu={e=>{e.preventDefault();e.stopPropagation();setCollectionMenu({x:e.clientX,y:e.clientY,collection:c})}}
            >
              <Bookmark size={14}/><span className="side-label">{c.name}</span><span className="collection-count">{count}</span>
              <span className="row-actions"><button className="tiny-btn" title="Collection options" onClick={e=>{e.preventDefault();e.stopPropagation();setCollectionMenu({x:e.clientX,y:e.clientY,collection:c})}}><MoreHorizontal size={15}/></button></span>
            </div>;
          })}
          {!db.collections.length && <div className="empty-side">Create collections for cross-folder groups</div>}
        </div>
      </div>

      <div className="saved-searches-section">
        <div className="section-head"><span>SAVED SEARCHES</span><button className="tiny-btn" title="Save current search" onClick={saveCurrentSearch} disabled={!search.trim()}><BookmarkPlus size={14}/></button></div>
        <div className="saved-search-list">
          {(db.saved_searches||[]).map(saved=>{
            return <div
              key={saved.id}
              className={`side-row saved-search-row ${search===saved.query && view==="all"?"active":""}`}
              title={saved.query}
              onClick={()=>openSavedSearch(saved)}
              onContextMenu={e=>{e.preventDefault();e.stopPropagation();setSavedSearchMenu({x:e.clientX,y:e.clientY,saved})}}
            >
              <Search size={14}/><span className="side-label">{saved.name}</span>
              <span className="row-actions"><button className="tiny-btn" title="Saved search options" onClick={e=>{e.preventDefault();e.stopPropagation();setSavedSearchMenu({x:e.clientX,y:e.clientY,saved})}}><MoreHorizontal size={15}/></button></span>
            </div>;
          })}
          {!db.saved_searches?.length && <div className="empty-side">Save useful search queries here</div>}
        </div>
      </div>

      <div className="tags-section">
        <div className="section-head"><span>TAGS</span><button className="tiny-btn" onClick={createTag}><Plus size={14}/></button></div>
        <div className="tag-list">
          {db.tags.map(t=>{
            const count=db.items.filter(item=>item.tags?.includes(t.name)).length;
            return <div key={t.id} draggable onDragStart={e=>{e.dataTransfer.effectAllowed="copy";e.dataTransfer.setData("application/x-mediavault-tag",t.name)}} className={`side-row ${view===`tag:${t.name}`?"active":""}`} onClick={()=>{setView(`tag:${t.name}`);setSelected([])}}
              onContextMenu={e=>{e.preventDefault();e.stopPropagation();setTagEditor({id:t.id,name:t.name,value:t.name,color:t.color||null})}}>
              <Tag size={14} style={{color:t.color||undefined}}/><span className="side-label">#{t.name}</span><span className="tag-count">{count}</span>{t.color&&<span className="tag-color-dot" style={{background:t.color}}/>}
              <span className="row-actions"><button className="tiny-btn" onClick={e=>{e.stopPropagation();setTagEditor({id:t.id,name:t.name,value:t.name,color:t.color||null})}}>•••</button></span>
            </div>;
          })}
          {!db.tags.length && <div className="empty-side">Create tags to organize media</div>}
        </div>
      </div>

      <div className="sidebar-bottom"><button className="library-info" onClick={()=>setStatsOpen(true)} title="Library statistics"><div className="library-path">Library<br/><span>{db.items.length} files</span></div><span className="library-size">{bytes(db.items.reduce((sum,x)=>sum+(Number(x.size)||0),0))}</span></button><button className="sidebar-settings" onClick={()=>setSettingsOpen(true)} title="Settings"><Settings size={17}/></button></div>
    </aside>

    <main className="main" onClick={closeContextMenu}>
      <header className="topbar">
        <div className="breadcrumbs"><span>Library</span><ChevronRight size={15}/><strong>{title}</strong></div>
        <div className="top-actions">
          <div className="search"><Search size={16}/><input ref={searchRef} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…  tag:games type:video color:red size:>100mb created:7d" /><kbd>Ctrl K</kbd></div>
          <button className="icon-btn" title="Save current search (Ctrl Shift S)" disabled={!search.trim()} onClick={saveCurrentSearch}><BookmarkPlus size={17}/></button>
          <button className="icon-btn" title="Paste from clipboard (Ctrl V)" onClick={pasteClipboard}><Clipboard size={17}/></button>
          <div className="view-switch" title="View mode">
            <button className={viewMode==="grid"?"active":""} onClick={()=>setViewMode("grid")} title="Grid view"><SlidersHorizontal size={14}/><span>Grid</span></button>
            <button className={viewMode==="compact"?"active":""} onClick={()=>setViewMode("compact")} title="Compact view"><Archive size={14}/><span>Compact</span></button>
            <button className={viewMode==="masonry"?"active":""} onClick={()=>setViewMode("masonry")} title="Masonry view"><ImageIcon size={14}/><span>Masonry</span></button>
          </div>
          <button className="icon-btn" title="Toggle inspector" onClick={()=>setShowInspector(v=>!v)}><PanelRight size={17}/></button>
          <button className="icon-btn" title="Prepare image thumbnails" onClick={warmThumbnails}><SlidersHorizontal size={17}/></button>
          <input className="range" title={viewMode==="masonry"?"Masonry column width":"Grid size"} type="range" min="150" max="340" value={grid} onChange={e=>setGrid(+e.target.value)}/>
        </div>
      </header>

      {selected.length>0 && <div className="selectionbar">
        <div><strong>{selected.length}</strong> selected</div>
        <div className="selection-actions">
          <button onClick={()=>setSelected([])}><X size={15}/> Clear</button>
          <button onClick={()=>setBulkMenu(bulkMenu==="tags"?null:"tags")}><Tag size={15}/> Tags</button>
          <button onClick={()=>openFolderAction("copy",selected)}><Copy size={15}/> Copy</button><button onClick={()=>openFolderAction("move",selected)}><Move size={15}/> Move</button>
          <button onClick={()=>setBulkMenu(bulkMenu==="color"?null:"color")}><Palette size={15}/> Color</button>
          <button onClick={openBatchRename}><Pencil size={15}/> Rename</button>
          {view==="inbox" && <button onClick={openInboxOrganizer}><ArchiveRestore size={15}/> Organize</button>}
          {view!=="inbox" && <button onClick={sendSelectedToInbox}><Inbox size={15}/> Inbox</button>}
          {view==="inbox" && <button onClick={archiveSelectedFromInbox}><ArchiveRestore size={15}/> Archive</button>}
          <button onClick={()=>setShowInspector(v=>!v)}><PanelRight size={15}/> Inspector</button>
          <button onClick={deleteSelected} className="danger"><Trash2 size={15}/> Delete</button>
          <button onClick={()=>{setSelected(filtered.filter(x=>!x.demo).map(x=>x.id))}}><Check size={15}/> Select visible</button>
        </div>
        {bulkMenu && <div className="bulk-popover">
          {bulkMenu==="tags"&&<><button onClick={addBulkTag}><Tag size={15}/> Add tag</button><button onClick={removeBulkTag}><Tag size={15}/> Remove tag</button><div className="popover-label">Available tags</div>{db.tags.length?db.tags.map(t=><button key={t.id} onClick={()=>{window.mediaVault.bulkUpdateTags(selected,[t.name],[]).then(db=>{setDb(db);setBulkMenu(null);notify(`Added #${t.name} to ${selected.length} item(s).`)})}}><Tag size={13} style={{color:t.color||undefined}}/>#{t.name}</button>):<span className="popover-empty">No tags yet</span>}</>}
          {bulkMenu==="move"&&<><div className="popover-label">Folder actions</div><button onClick={()=>openFolderAction("copy",selected)}><Copy size={15}/> Copy to folder…</button><button onClick={()=>openFolderAction("move",selected)}><Move size={15}/> Move to folder…</button></>}
          {bulkMenu==="color"&&<><div className="popover-label">Item color</div><div className="color-grid">{itemColors.map(c=><button key={c.name} className="color-choice" title={c.name} onClick={()=>setColor(selected,c.value)}><span style={{background:c.css}}>{!c.value&&<X size={11}/>}</span></button>)}</div></>}
        </div>}
      </div>}

      <section
        className={`content view-${viewMode}`}
        style={{"--grid-size":`${grid}px`}}
        onClick={e=>{
          const target=e.target;
          if(target===e.currentTarget || target.classList?.contains("media-grid")){
            setContextMenu(null);
            setBulkMenu(null);
            if(selected.length) setSelected([]);
          }
        }}
      >
        <div className="content-head">
          <div><h1>{title}</h1><span>{view==="duplicates" ? `${duplicateGroups.length} groups · ${duplicateExtraCount} extra copies` : `${filtered.length} items`}{view!=="duplicates" && viewMode==="masonry" ? " · Masonry" : view!=="duplicates" && viewMode==="compact" ? " · Compact" : ""}</span></div>
          <div className="head-actions">
            {view==="duplicates" ? <>
              <button className="small-btn" onClick={selectDuplicateExtras} disabled={!duplicateExtraCount}><Check size={15}/> Select duplicates</button>
              <button className="small-btn" onClick={clearDuplicateSelection} disabled={!selected.length}><X size={15}/> Clear selection</button>
            </> : <>
              {view==="inbox" && <button className="small-btn" onClick={openInboxOrganizer} disabled={!selected.length}><ArchiveRestore size={15}/> Organize selected</button>}
              <button className="small-btn" onClick={()=>createFolder(activeFolder||null)}><FolderInput size={15}/> {activeFolder?"New subfolder":"New folder"}</button>
              <button className="small-btn" onClick={createTag}><Tag size={15}/> New tag</button>
            </>}
          </div>
        </div>

        {view!=="duplicates" && showDropHint && <div className="dropzone-hint">{view==="inbox" ? "Drop files here to add them to Inbox · select items and use Organize when ready" : "Drop files anywhere to import them into the current folder"}</div>}

        {view==="duplicates" ? <div className="duplicate-manager">
          <div className="duplicate-summary">
            <div className="duplicate-summary-card"><Copy size={17}/><div><strong>{duplicateGroups.length}</strong><span>duplicate groups</span></div></div>
            <div className="duplicate-summary-card"><Trash2 size={17}/><div><strong>{duplicateExtraCount}</strong><span>redundant copies</span></div></div>
            <div className="duplicate-summary-card"><HardDrive size={17}/><div><strong>{bytes(duplicateWastedBytes)||"0 B"}</strong><span>recoverable space</span></div></div>
            <label className="duplicate-sort"><span>Keep first by</span><select value={duplicateSort} onChange={e=>setDuplicateSort(e.target.value)}>
              <option value="oldest">Oldest</option>
              <option value="newest">Newest</option>
              <option value="largest">Largest</option>
            </select></label>
          </div>

          {!duplicateGroups.length ? <div className="duplicate-empty">
            <Copy size={42}/><h2>No exact duplicates</h2><p>MediaVault compares SHA-256 content hashes, so files with different names are still detected when their contents are identical.</p>
          </div> :
          duplicateGroups.map((group,index)=><section className="duplicate-group" key={group.hash}>
            <div className="duplicate-group-head">
              <div>
                <strong>Group {index+1}</strong>
                <span>{group.items.length} identical copies · {bytes(group.wastedBytes)} recoverable</span>
              </div>
              <button className="small-btn" onClick={()=>setSelected(group.extra.map(item=>item.id))}><Check size={14}/> Select extras</button>
            </div>
            <div className="duplicate-group-grid">
              {group.items.map((item,itemIndex)=><Card key={item.id} item={item} selected={selected.includes(item.id)}
                onClick={e=>selectCard(item,e)} onOpen={setPreview} onFavorite={toggleFav} onContextMenu={handleContextMenu}
                onDragStart={(id,e)=>{
                  setDraggedId(id);
                  const ids=selected.includes(id) ? selected.filter(x=>!String(x).startsWith("demo-")) : [id];
                  e?.dataTransfer?.setData("application/x-mediavault-item",JSON.stringify(ids));
                }}
                onDragEnd={()=>{setDraggedId(null);setDragOverFolder(null)}} onDropTag={dropTagOnItem} onDropFiles={dropFilesOnItem}/>)}
            </div>
          </section>)}
        </div> : <div className={`grid media-grid ${viewMode}-grid`}>
          {filtered.map(item=><Card key={item.id} item={item} selected={selected.includes(item.id)}
            onClick={e=>selectCard(item,e)} onOpen={setPreview} onFavorite={toggleFav} onContextMenu={handleContextMenu}
            onDragStart={(id,e)=>{
              setDraggedId(id);
              const ids=selected.includes(id) ? selected.filter(x=>!String(x).startsWith("demo-")) : [id];
              e?.dataTransfer?.setData("application/x-mediavault-item",JSON.stringify(ids));
            }}
            onDragEnd={()=>{setDraggedId(null);setDragOverFolder(null)}} onDropTag={dropTagOnItem} onDropFiles={dropFilesOnItem}/>)}
          {!filtered.length && <div className={`empty-state ${emptyState.firstRun?"first-run":""}`}>
            {emptyState.icon==="search" ? <Search size={42}/> :
             emptyState.icon==="heart" ? <Heart size={42}/> :
             emptyState.icon==="inbox" ? <Inbox size={42}/> :
             emptyState.icon==="clock" ? <Clock3 size={42}/> :
             emptyState.icon==="harddrive" ? <HardDrive size={42}/> :
             emptyState.icon==="image" ? <ImageIcon size={42}/> :
             emptyState.icon==="video" ? <Video size={42}/> :
             <Archive size={42}/>}
            <h2>{emptyState.title}</h2>
            <p>{emptyState.text}</p>
            {emptyState.firstRun && <div className="first-run-actions">
              <button className="import-btn" onClick={async()=>{const paths=await window.mediaVault.chooseImportFiles();await importPaths(paths)}}><Plus size={17}/> Import files</button>
              <button className="small-btn" onClick={pasteClipboard}><Clipboard size={15}/> Paste from clipboard</button>
            </div>}
            {!emptyState.firstRun && !search.trim() && view!=="favorites" && view!=="inbox" && <button className="import-btn" onClick={async()=>{const paths=await window.mediaVault.chooseImportFiles();await importPaths(paths)}}><Plus size={17}/> Import files</button>}
          </div>}
        </div>}
      </section>
    </main>

    {showInspector && <aside className="inspector">
      <div className="inspector-head"><div><strong>Inspector</strong><span>{selected.length?`${selected.length} selected`:"Nothing selected"}</span></div><button className="icon-btn" onClick={()=>setShowInspector(false)}><X size={16}/></button></div>
      {selected.length===1&&db.items.find(x=>x.id===selected[0])?(()=>{const item=db.items.find(x=>x.id===selected[0]);return <div className="inspector-body">
        <div className="inspector-preview">{item.type==="image"?<ImageThumb path={item.stored_path}/>:item.type==="video"?<VideoThumb path={item.stored_path}/>:<File size={38}/>}</div>

        <div className="inspector-name-row">
          <div className="inspector-name" title={item.name}>{item.name}</div>
          <button className="tiny-btn inspector-rename-btn" title="Rename file" onClick={()=>renameItem(item)}><Pencil size={14}/></button>
        </div>

        <div className="inspector-section inspector-section-compact"><span>COLOR</span><div className="color-grid inspector-color-grid">{itemColors.map(c=><button key={c.name} className={`color-choice ${item.color===c.value?"selected":""}`} title={c.name} onClick={()=>setColor([item.id],c.value)}><span style={{background:c.css}}>{!c.value&&<X size={11}/>}</span></button>)}</div></div>

        <div className="inspector-section inspector-section-compact"><span>TAGS</span><div className="inspector-tags">{item.tags?.length?item.tags.map(t=><span key={t}>#{t}</span>):<small>No tags</small>}</div></div>

        <div className="inspector-section inspector-section-compact"><span>FOLDER</span><strong>{db.folders.find(f=>f.id===item.folder_id)?.name||"Root"}</strong></div>

        <div className="inspector-section inspector-info-section">
          <div className="inspector-section-head"><span>INFO</span><button className="tiny-btn" title="Edit notes and source" onClick={()=>openInfoEditor(item)}><Pencil size={13}/></button></div>
          <div className="inspector-note">{item.notes?.trim()?item.notes:<small>No note</small>}</div>
          {item.source_url?.trim() ?
            <button className="inspector-source" title={item.source_url} onClick={()=>window.mediaVault.openUrl(item.source_url)}><ExternalLink size={12}/><span>{item.source_url}</span></button>
            : <small className="inspector-no-source">No source URL</small>}
        </div>

        <div className="inspector-grid"><div><span>TYPE</span><strong>{item.type}</strong></div><div><span>SIZE</span><strong>{bytes(item.size)}</strong></div>{inspectorData?.width&&<div><span>DIMENSIONS</span><strong>{inspectorData.width} × {inspectorData.height}</strong></div>}<div><span>FORMAT</span><strong>{item.extension}</strong></div></div>

        <div className="inspector-action-row">
          <button className="small-btn inspector-details" onClick={()=>openMetadata(item)}><Settings size={14}/> Full details</button>
          <button className="small-btn inspector-details" onClick={()=>renameItem(item)}><Pencil size={14}/> Rename</button>
        </div>
      </div>})():<div className="inspector-empty"><PanelRight size={28}/><p>Select one item to inspect its tags, color, folder and metadata.</p></div>}
    </aside>}

    {preview && <div ref={viewerRef} className={`media-viewer ${viewerFullscreen?"viewer-fullscreen":""}`} onMouseDown={e=>e.target===e.currentTarget&&setPreview(null)}>
      <div className="viewer-topbar">
        <div className="viewer-heading">
          <div className="viewer-heading-main">
            {preview.type==="image" ? <ImageIcon size={16}/> : preview.type==="video" ? <Video size={16}/> : <File size={16}/>}
            <strong title={preview.name}>{preview.name}</strong>
          </div>
          <span>{preview.type.toUpperCase()} · {bytes(preview.size)}</span>
        </div>
        <div className="viewer-top-actions">
          <button className="icon-btn" title="Previous" onClick={()=>navigatePreview(-1)}><ChevronDown className="viewer-left-icon" size={18}/></button>
          <span className="viewer-counter">{previewIndex+1} / {filtered.length}</span>
          <button className="icon-btn" title="Next" onClick={()=>navigatePreview(1)}><ChevronRight size={18}/></button>
          <button className="icon-btn" title="Fullscreen (F)" onClick={toggleViewerFullscreen}>{viewerFullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>
          <button className="icon-btn" title="Close (Esc)" onClick={()=>setPreview(null)}><X size={18}/></button>
        </div>
      </div>

      <div className="viewer-main">
        <div className="viewer-stage">
          <div className="viewer-canvas" style={{transform:`scale(${viewerZoom}) rotate(${viewerRotation}deg)`}}>
            {preview.demo ? <div className="preview-demo" style={{background:demoGradients[demoItems.findIndex(x=>x.id===preview.id)%demoGradients.length]}}>{preview.type==="video"&&<Play size={70}/>}</div> :
            preview.type==="image" ? <img src={fileUrl(preview.stored_path)} draggable="false" /> :
            preview.type==="video" ? <video src={fileUrl(preview.stored_path)} controls autoPlay /> :
            <div className="preview-file"><File size={70}/><b>{preview.name}</b></div>}
          </div>

          <div className="viewer-controls">
            <button className="viewer-control-btn" title="Zoom out (-)" onClick={()=>setViewerZoom(z=>Math.max(.25,Math.round((z-.1)*100)/100))}><ZoomOut size={16}/></button>
            <button className="viewer-zoom-value" title="Reset zoom (0)" onClick={()=>setViewerZoom(1)}>{Math.round(viewerZoom*100)}%</button>
            <button className="viewer-control-btn" title="Zoom in (+)" onClick={()=>setViewerZoom(z=>Math.min(3,Math.round((z+.1)*100)/100))}><ZoomIn size={16}/></button>
            <button className="viewer-control-btn" title="Rotate (R)" onClick={()=>setViewerRotation(r=>(r+90)%360)}><RotateCw size={16}/></button>
            {!preview.demo && <button className="viewer-control-btn" title="Open externally" onClick={()=>window.mediaVault.openFile(preview.stored_path)}><ExternalLink size={16}/></button>}
            <div className="viewer-control-spacer"/>
            <span className="viewer-hint">← → navigate · + / − zoom · R rotate · F fullscreen · Esc close</span>
          </div>
        </div>

        <aside className="viewer-sidebar">
          <div className="viewer-sidebar-head">
            <div><Info size={15}/><strong>Details</strong></div>
            {!preview.demo && <button className="tiny-btn" title="Full details" onClick={()=>openMetadata(preview)}><ExternalLink size={14}/></button>}
          </div>

          <div className="viewer-sidebar-scroll">
            <div className="viewer-preview-mini">
              {preview.type==="image" && !preview.demo ? <ImageThumb path={preview.stored_path}/> :
               preview.type==="video" && !preview.demo ? <VideoThumb path={preview.stored_path}/> :
               preview.demo ? <div className="viewer-mini-demo" style={{background:demoGradients[demoItems.findIndex(x=>x.id===preview.id)%demoGradients.length]}}>{preview.type==="video"&&<Play size={28}/>}</div> :
               <File size={34}/>}
            </div>

            <div className="viewer-name" title={preview.name}>{preview.name}</div>

            <div className="viewer-section">
              <span className="viewer-label">METADATA</span>
              <div className="viewer-meta-grid">
                <div><small>Type</small><strong>{viewerMetadata?.type || preview.type}</strong></div>
                <div><small>Format</small><strong>{viewerMetadata?.extension || preview.extension || "—"}</strong></div>
                <div><small>Size</small><strong>{bytes(viewerMetadata?.size || preview.size) || "—"}</strong></div>
                {viewerMetadata?.width && <div><small>Dimensions</small><strong>{viewerMetadata.width} × {viewerMetadata.height}</strong></div>}
                {!preview.demo && viewerMetadata?.createdAt && <div><small>Created</small><strong>{new Date(viewerMetadata.createdAt).toLocaleDateString()}</strong></div>}
                {!preview.demo && viewerMetadata?.modifiedAt && <div><small>Modified</small><strong>{new Date(viewerMetadata.modifiedAt).toLocaleDateString()}</strong></div>}
              </div>
            </div>

            <div className="viewer-section">
              <span className="viewer-label">TAGS</span>
              <div className="viewer-tags">
                {(preview.tags||[]).length ? preview.tags.map(t=>
                  <span key={t} className="viewer-tag-chip">#{t}{!preview.demo&&<button title="Remove tag" onClick={()=>viewerRemoveTag(t)}><X size={11}/></button>}</span>
                ) : <small className="viewer-empty">No tags</small>}
              </div>
              {!preview.demo && db.tags.length>0 && <div className="viewer-tag-add">
                <span>Add</span>
                <select defaultValue="" onChange={e=>{const v=e.target.value;if(v)viewerAddTag(v);e.target.value=""}}>
                  <option value="">Choose tag…</option>
                  {db.tags.filter(t=>!(preview.tags||[]).includes(t.name)).map(t=><option key={t.id} value={t.name}>#{t.name}</option>)}
                </select>
              </div>}
            </div>

            <div className="viewer-section">
              <div className="viewer-label-row"><span className="viewer-label">INFO</span>{!preview.demo&&<button className="tiny-btn" title="Edit notes and source" onClick={()=>openInfoEditor(preview)}><Pencil size={13}/></button>}</div>
              <div className="viewer-note">{preview.notes?.trim()?preview.notes:<small>No note</small>}</div>
              {preview.source_url?.trim() ?
                <button className="viewer-source" onClick={()=>window.mediaVault.openUrl(preview.source_url)} title={preview.source_url}><ExternalLink size={12}/><span>{preview.source_url}</span></button>
                : <small className="viewer-empty">No source URL</small>}
            </div>

            <div className="viewer-section">
              <span className="viewer-label">COLOR</span>
              <div className="color-grid viewer-color-grid">
                {itemColors.map(c=><button key={c.name} className={`color-choice ${preview.color===c.value?"selected":""}`} title={c.name} onClick={()=>viewerSetColor(c.value)} disabled={preview.demo}><span style={{background:c.css}}>{!c.value&&<X size={11}/>}</span></button>)}
              </div>
            </div>

            <div className="viewer-section">
              <span className="viewer-label">FOLDER</span>
              <select className="viewer-folder-select" disabled={preview.demo} value={preview.folder_id||""} onChange={e=>viewerMoveFolder(e.target.value||null)}>
                <option value="">Library root</option>
                {db.folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>

            {!preview.demo && <div className="viewer-section viewer-action-section">
              <button className="small-btn" onClick={()=>{setTagModal(preview);setPreview(null)}}><Tag size={14}/> Edit tags</button>
              <button className="small-btn" onClick={()=>window.mediaVault.revealFile(preview.stored_path)}><FolderOpen size={14}/> Show in folder</button>
            </div>}
          </div>
        </aside>
      </div>

      <div className="viewer-filmstrip-wrap">
        <div className="viewer-filmstrip">
          {filtered.map(item=>
            <button key={item.id} className={`viewer-film-thumb ${item.id===preview.id?"active":""}`} onClick={()=>setPreview(item)} title={item.name}>
              {item.demo ? <div className="viewer-strip-demo" style={{background:demoGradients[demoItems.findIndex(x=>x.id===item.id)%demoGradients.length]}}>{item.type==="video"&&<Play size={18}/>}</div> :
               item.type==="image" ? <ImageThumb path={item.stored_path}/> :
               item.type==="video" ? <VideoThumb path={item.stored_path}/> :
               <div className="file-thumb"><File size={18}/></div>}
            </button>
          )}
        </div>
      </div>
    </div>}

    {inboxOrganizer && <Modal wide onClose={()=>setInboxOrganizer(null)}>
      <div className="modal-head"><h2>Organize Inbox</h2><button className="icon-btn" onClick={()=>setInboxOrganizer(null)}><X/></button></div>
      <div className="inbox-organizer">
        <div className="inbox-organizer-subtitle">{inboxOrganizer.ids.length} selected item{inboxOrganizer.ids.length===1?"":"s"} will be organized and removed from Inbox.</div>

        <label className="organizer-field">
          <span>Folder</span>
          <select value={inboxFolderMode==="keep"?"__keep__":inboxFolderMode==="root"?"__root__":inboxFolderId}
            onChange={e=>{
              const v=e.target.value;
              if(v==="__keep__"){setInboxFolderMode("keep");setInboxFolderId("");}
              else if(v==="__root__"){setInboxFolderMode("root");setInboxFolderId("");}
              else {setInboxFolderMode("folder");setInboxFolderId(v);}
            }}>
            <option value="__keep__">Keep current folder</option>
            <option value="__root__">Root</option>
            {db.folders.map(folder=><option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        </label>

        <label className="organizer-field">
          <span>Collection</span>
          <select value={inboxCollectionId} onChange={e=>setInboxCollectionId(e.target.value)}>
            <option value="">No collection change</option>
            {(db.collections||[]).map(collection=><option key={collection.id} value={collection.id}>{collection.name}</option>)}
          </select>
        </label>

        <label className="organizer-field">
          <span>Add tags</span>
          <input value={inboxTags} onChange={e=>setInboxTags(e.target.value)} placeholder="wallpaper, reference, inspiration"/>
          <small>Separate multiple tags with commas. New tags are created automatically.</small>
        </label>

        <div className="organizer-field">
          <span>Item color</span>
          <select value={inboxColorMode==="keep"?"__keep__":inboxColorMode==="remove"?"__remove__":(inboxColor||"")} onChange={e=>{
            const v=e.target.value;
            if(v==="__keep__"){setInboxColorMode("keep");setInboxColor(null);}
            else if(v==="__remove__"){setInboxColorMode("remove");setInboxColor(null);}
            else {setInboxColorMode("set");setInboxColor(v);}
          }}>
            <option value="__keep__">Keep current colors</option>
            <option value="__remove__">Remove colors</option>
            {itemColors.filter(c=>c.value).map(c=><option key={c.value} value={c.value}>{c.name}</option>)}
          </select>
        </div>

        <div className="organizer-note"><Inbox size={14}/><span>Applying this action also archives the selected items, so they disappear from Inbox but remain in your library.</span></div>

        <div className="modal-actions">
          <button className="small-btn" onClick={()=>setInboxOrganizer(null)}>Cancel</button>
          <button className="primary-btn" onClick={submitInboxOrganizer}><ArchiveRestore size={14}/> Organize &amp; archive</button>
        </div>
      </div>
    </Modal>}

    {infoDialog && <Modal onClose={()=>setInfoDialog(null)}>
      <div className="modal-head"><h2>Edit info</h2><button className="icon-btn" onClick={()=>setInfoDialog(null)}><X/></button></div>
      <div className="info-editor">
        <div className="info-editor-name" title={infoDialog.name}>{infoDialog.name}</div>
        <label>Notes<textarea autoFocus value={infoNotes} onChange={e=>setInfoNotes(e.target.value)} placeholder="Add a note about this item…" rows={6}/></label>
        <label>Source URL<input value={infoSourceUrl} onChange={e=>setInfoSourceUrl(e.target.value)} placeholder="https://example.com/source"/></label>
        <div className="info-editor-hint">Search supports <code>note:</code> and <code>source:</code> in addition to normal free-text search.</div>
        <div className="modal-actions">
          <button className="small-btn" onClick={()=>setInfoDialog(null)}>Cancel</button>
          <button className="primary-btn" onClick={saveInfoEditor}>Save info</button>
        </div>
      </div>
    </Modal>}

    {metadata && <Modal onClose={()=>setMetadata(null)}>
      <div className="modal-head"><h2>Details</h2><button className="icon-btn" onClick={()=>setMetadata(null)}><X/></button></div>
      <div className="metadata-panel">
        <div className="metadata-preview">
          {metadata.item.type==="image" ? <ImageThumb path={metadata.item.stored_path}/> :
           metadata.item.type==="video" ? <VideoThumb path={metadata.item.stored_path}/> :
           <File size={46}/>}
        </div>
        <div className="metadata-grid">
          <div><span>Name</span><strong title={metadata.item.name}>{metadata.item.name}</strong></div>
          <div><span>Type</span><strong>{metadata.data?.type || metadata.item.type}</strong></div>
          <div><span>Size</span><strong>{bytes(metadata.data?.size || metadata.item.size)}</strong></div>
          <div><span>Format</span><strong>{metadata.data?.extension || metadata.item.extension}</strong></div>
          {metadata.data?.width && <div><span>Dimensions</span><strong>{metadata.data.width} × {metadata.data.height}</strong></div>}
          <div><span>Created</span><strong>{metadata.data?.createdAt ? new Date(metadata.data.createdAt).toLocaleString() : "—"}</strong></div>
          <div><span>Modified</span><strong>{metadata.data?.modifiedAt ? new Date(metadata.data.modifiedAt).toLocaleString() : "—"}</strong></div>
          <div className="full"><span>Stored path</span><strong title={metadata.item.stored_path}>{metadata.item.stored_path}</strong></div>
        </div>
      </div>
      <div className="modal-actions"><button onClick={()=>window.mediaVault.revealFile(metadata.item.stored_path)}><FolderOpen size={15}/> Show in folder</button></div>
    </Modal>}

    {tagModal && <Modal onClose={()=>setTagModal(null)}>
      <div className="modal-head"><h2>Edit tags</h2><button className="icon-btn" onClick={()=>setTagModal(null)}><X/></button></div>
      <div className="tag-editor">
        <div className="editor-current">{(tagModal.tags||[]).map(t=><span className="chip" key={t}>#{t}<button onClick={()=>removeItemTag(tagModal,t)}><X size={12}/></button></span>)}</div>
        <div className="popover-label">Available tags</div>
        <div className="available-tags">{db.tags.map(t=><button key={t.id} className="tag-choice" onClick={()=>addItemTag(tagModal,t.name)}><Tag size={12} style={{color:t.color||undefined}}/>#{t.name}</button>)}</div>
        <button className="small-btn" onClick={createTag}><Plus size={15}/> New tag</button>
      </div>
    </Modal>}

    {folderModal && <Modal onClose={()=>setFolderModal(null)}>
      <div className="modal-head"><h2>Folder</h2><button className="icon-btn" onClick={()=>setFolderModal(null)}><X/></button></div>
      <p className="modal-text">Delete <strong>{folderModal.name}</strong>? Items will be moved to the parent folder.</p>
      <div className="modal-actions"><button onClick={()=>setFolderModal(null)}>Cancel</button><button className="danger" onClick={deleteFolder}><Trash2 size={15}/> Delete folder</button></div>
    </Modal>}

    {createDialog && <Modal onClose={()=>setCreateDialog(null)}>
      <div className="modal-head"><h2>{createDialog.type==="folder" ? (createDialog.parentId ? "New subfolder" : "New folder") : createDialog.type==="collection" ? "New collection" : createDialog.type==="saved-search" ? "Save search" : "New tag"}</h2><button className="icon-btn" onClick={()=>setCreateDialog(null)}><X/></button></div>
      <input autoFocus ref={el=>{if(el){requestAnimationFrame(()=>el.focus())}}} className="modal-input" value={createName} onChange={e=>setCreateName(e.target.value)} onInput={e=>setCreateName(e.currentTarget.value)} placeholder={createDialog.type==="folder" ? "Folder name" : createDialog.type==="collection" ? "Collection name" : createDialog.type==="saved-search" ? "Saved search name" : "Tag name (without #)"} onMouseDown={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter"){e.preventDefault();submitCreate()}if(e.key==="Escape"){e.preventDefault();setCreateDialog(null)}}} />
      <div className="modal-actions"><button onClick={()=>setCreateDialog(null)}>Cancel</button><button onClick={submitCreate} disabled={!createName.trim()}><Check size={15}/> Create</button></div>
    </Modal>}

    {batchRenameOpen && <Modal onClose={()=>setBatchRenameOpen(false)} wide>
      <div className="modal-head">
        <div>
          <h2>Batch rename</h2>
          <small className="modal-subtitle">{selected.length} item(s) selected</small>
        </div>
        <button className="icon-btn" onClick={()=>setBatchRenameOpen(false)}><X/></button>
      </div>

      <div className="batch-rename-help">
        Use <code>{"{name}"}</code> for the current filename, <code>{"{n}"}</code> for a counter, <code>{"{date}"}</code> via year/month/day tokens, and <code>{"{ext}"}</code> for the extension.
      </div>

      <div className="batch-rename-form">
        <label>
          <span>Pattern</span>
          <input
            autoFocus
            className="modal-input"
            value={batchRenamePattern}
            onChange={e=>setBatchRenamePattern(e.target.value)}
            onKeyDown={e=>{e.stopPropagation();if(e.key==="Escape"){e.preventDefault();setBatchRenameOpen(false)}if(e.key==="Enter"){e.preventDefault();submitBatchRename()}}}
          />
        </label>
        <label>
          <span>Start number</span>
          <input
            className="number-input"
            type="number"
            min="0"
            value={batchRenameStart}
            onChange={e=>setBatchRenameStart(Math.max(0,Number(e.target.value)||0))}
          />
        </label>
      </div>

      <div className="batch-token-row">
        <span>Tokens</span>
        {["{name}","{n}","{index}","{ext}","{year}","{month}","{day}"].map(token=>
          <button key={token} className="token-btn" onClick={()=>setBatchRenamePattern(p=>p+token)}>{token}</button>
        )}
      </div>

      <div className="batch-preview">
        <div className="batch-preview-head"><span>PREVIEW</span><span>{batchRenamePreview.length} files</span></div>
        <div className="batch-preview-list">
          {batchRenamePreview.map(row=><div key={row.id} className="batch-preview-row">
            <span className="batch-old" title={row.old}>{row.old}</span>
            <ChevronRight size={13}/>
            <span className="batch-new" title={row.new}>{row.new}</span>
          </div>)}
          {!batchRenamePreview.length && <div className="popover-empty">No files selected.</div>}
        </div>
      </div>

      <div className="modal-actions">
        <button onClick={()=>setBatchRenameOpen(false)}>Cancel</button>
        <button onClick={submitBatchRename} disabled={!batchRenamePreview.length}><Pencil size={15}/> Rename {batchRenamePreview.length} files</button>
      </div>
    </Modal>}

    {renameDialog && <Modal onClose={()=>setRenameDialog(null)}>
      <div className="modal-head"><h2>{renameDialog.type==="item" ? "Rename file" : renameDialog.type==="saved-search" ? "Rename saved search" : "Rename folder"}</h2><button className="icon-btn" onClick={()=>setRenameDialog(null)}><X/></button></div>
      <input autoFocus className="modal-input" value={renameName} onChange={e=>setRenameName(e.target.value)} onMouseDown={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter"){e.preventDefault();submitRename()}if(e.key==="Escape"){e.preventDefault();setRenameDialog(null)}}}/>
      <div className="modal-actions"><button onClick={()=>setRenameDialog(null)}>Cancel</button><button onClick={submitRename} disabled={!renameName.trim()}><Check size={15}/> Rename</button></div>
    </Modal>}

    {collectionPicker && <Modal onClose={()=>setCollectionPicker(null)} wide>
      <div className="modal-head"><div><h2>Collections</h2><small className="modal-subtitle">{collectionPicker.ids.length} item(s) selected</small></div><button className="icon-btn" onClick={()=>setCollectionPicker(null)}><X/></button></div>
      <div className="collection-picker">
        {(db.collections||[]).map(c=>{
          const items=collectionPicker.ids.map(id=>db.items.find(x=>x.id===id)).filter(Boolean);
          const every=items.length>0 && items.every(item=>(item.collection_ids||[]).includes(c.id));
          const some=!every && items.some(item=>(item.collection_ids||[]).includes(c.id));
          return <button key={c.id} className={`collection-picker-row ${every?"checked":""}`} onClick={()=>toggleCollectionForSelection(c.id)}>
            <span className={`collection-check ${every?"checked":""} ${some?"partial":""}`}>{every?<Check size={13}/>:some?"−":""}</span>
            <Bookmark size={15}/><span>{c.name}</span>
            <small>{items.filter(item=>(item.collection_ids||[]).includes(c.id)).length}/{items.length}</small>
          </button>;
        })}
        {!(db.collections||[]).length && <div className="popover-empty">No collections yet. Create one from the sidebar.</div>}
      </div>
      <div className="modal-actions"><button onClick={()=>setCollectionPicker(null)}>Done</button></div>
    </Modal>}

    {folderAction && <Modal onClose={()=>setFolderAction(null)} wide>
      <div className="modal-head"><div><h2>{folderAction.mode==="copy"?"Copy to folder":"Move to folder"}</h2><small className="modal-subtitle">{folderAction.ids.length} item(s) selected</small></div><button className="icon-btn" onClick={()=>setFolderAction(null)}><X/></button></div>
      <div className="folder-picker">
        <button className="folder-picker-row root" onClick={()=>submitFolderAction(null)}><Archive size={15}/><span>Library root</span></button>
        {(()=>{const children=p=>db.folders.filter(f=>(f.parentId||null)===p); const node=(f,d=0)=><React.Fragment key={f.id}><button className="folder-picker-row" style={{paddingLeft:12+d*18}} onClick={()=>submitFolderAction(f.id)}><Folder size={15} style={{color:f.color||undefined}}/><span>{f.name}</span></button>{children(f.id).map(c=>node(c,d+1))}</React.Fragment>;return children(null).map(f=>node(f));})()}
        {!db.folders.length&&<div className="popover-empty">No folders yet. Choose Library root.</div>}
      </div>
      <div className="modal-actions"><button onClick={()=>setFolderAction(null)}>Cancel</button></div>
    </Modal>}

    {statsOpen && <Modal onClose={()=>setStatsOpen(false)} wide>
      <div className="modal-head"><h2>Library statistics</h2><button className="icon-btn" onClick={()=>setStatsOpen(false)}><X/></button></div>
      <div className="stats-panel">
        <div className="stat-card"><strong>{db.items.length}</strong><span>Total items</span></div>
        <div className="stat-card"><strong>{db.items.filter(x=>x.type==="image").length}</strong><span>Images</span></div>
        <div className="stat-card"><strong>{db.items.filter(x=>x.type==="video").length}</strong><span>Videos</span></div>
        <div className="stat-card"><strong>{db.items.filter(x=>x.type!=="image"&&x.type!=="video").length}</strong><span>Files</span></div>
        <div className="stat-card"><strong>{db.folders.length}</strong><span>Folders</span></div>
        <div className="stat-card"><strong>{db.tags.length}</strong><span>Tags</span></div>
        <div className="stat-card wide-stat"><strong>{bytes(db.items.reduce((sum,x)=>sum+(Number(x.size)||0),0)) || "0 B"}</strong><span>MediaVault storage</span></div>
        <div className="stat-card wide-stat"><strong>{db.items.filter(x=>x.favorite).length}</strong><span>Favorites</span></div>
      </div>
    </Modal>}

    {settingsOpen && <Modal onClose={()=>setSettingsOpen(false)}>
      <div className="modal-head"><h2>Settings</h2><button className="icon-btn" onClick={()=>setSettingsOpen(false)}><X/></button></div>
      <div className="settings-panel">
        <div className="settings-section"><span className="settings-title">Appearance</span>
          <label className="setting-row"><div><strong>Thumbnail size</strong><small>Adjust the media grid size.</small></div><input type="range" min="160" max="340" value={grid} onChange={e=>setGrid(+e.target.value)}/></label>
        </div>
        <div className="settings-section"><span className="settings-title">Behavior</span>
          <label className="setting-row"><div><strong>Confirm before deleting</strong><small>Ask before removing items from MediaVault.</small></div><input type="checkbox" checked={confirmDelete} onChange={e=>setConfirmDelete(e.target.checked)}/></label>
          <label className="setting-row"><div><strong>Show drop hint</strong><small>Show the import hint above the media grid.</small></div><input type="checkbox" checked={showDropHint} onChange={e=>setShowDropHint(e.target.checked)}/></label>
        </div>
        <div className="settings-section"><span className="settings-title">Library</span>
          <div className="library-location"><span>Library</span><strong>Documents\MediaVault</strong></div>
          <div className="library-location"><span>Thumbnails</span><strong>Documents\MediaVault\thumbnails</strong></div>
          <button className="small-btn" onClick={()=>window.mediaVault.openLibraryFolder()}><FolderOpen size={15}/> Open library folder</button>
        </div>

        <div className="settings-section"><span className="settings-title">Backup & Restore</span>
          <div className="backup-copy">Backups include your library database, folders, tags, collections, favorites and stored media files.</div>
          <div className="backup-actions">
            <button className="small-btn" onClick={backupLibrary} disabled={backupBusy}><Archive size={15}/> {backupBusy?"Working…":"Backup now"}</button>
            <button className="small-btn" onClick={restoreBackup} disabled={backupBusy}><Archive size={15}/> Restore backup</button>
            <button className="small-btn" onClick={openBackupsFolder} disabled={backupBusy}><FolderOpen size={15}/> Open backups</button>
          </div>
          <div className="backup-hint">Backups are stored in <strong>Documents\MediaVault Backups</strong>. Restore always creates a safety backup of your current library first.</div>
        </div>

        <div className="settings-section">
          <span className="settings-title">About</span>
          <div className="about-grid">
            <div><span>Version</span><strong>2.0.2</strong></div>
            <div><span>Storage model</span><strong>Local-first</strong></div>
            <div><span>Library</span><strong>Documents\MediaVault</strong></div>
            <div><span>Backups</span><strong>Documents\MediaVault Backups</strong></div>
          </div>
          <div className="about-note">Your media stays on this PC unless you explicitly move or copy it elsewhere.</div>
        </div>

        <div className="settings-section">
          <span className="settings-title">Keyboard shortcuts</span>
          <div className="shortcut-grid">
            <div><kbd>Ctrl V</kbd><span>Paste from clipboard</span></div>
            <div><kbd>Ctrl K</kbd><span>Focus search</span></div>
            <div><kbd>Ctrl Shift S</kbd><span>Save current search</span></div>
            <div><kbd>Ctrl Shift N</kbd><span>New folder</span></div>
            <div><kbd>Ctrl Shift F</kbd><span>Toggle favorites</span></div>
            <div><kbd>F2</kbd><span>Rename</span></div>
            <div><kbd>Space / Enter</kbd><span>Preview selected</span></div>
            <div><kbd>Delete</kbd><span>Move to trash</span></div>
            <div><kbd>Ctrl Z</kbd><span>Undo delete</span></div>
          </div>
        </div>

        <div className="settings-footer">MediaVault v2.0.2 · Local-first library</div>
      </div>
    </Modal>}

    {toast && <div className="toast">{toast}</div>}

    {collectionMenu && <div className="context-menu collection-menu" style={{left:Math.min(collectionMenu.x,window.innerWidth-235),top:Math.min(collectionMenu.y,window.innerHeight-190)}} onMouseDown={e=>e.stopPropagation()}>
      <div className="context-title"><Bookmark size={14}/> {collectionMenu.collection.name}</div>
      <button onClick={()=>{setView(`collection:${collectionMenu.collection.id}`);setSelected([]);setCollectionMenu(null)}}><Bookmark size={15}/> Open collection</button>
      <button onClick={()=>openCollectionPicker(selected.length?selected:db.items.filter(item=>(item.collection_ids||[]).includes(collectionMenu.collection.id)).map(item=>item.id))}><Bookmark size={15}/> Manage items</button>
      <button onClick={()=>renameCollection(collectionMenu.collection)}><Pencil size={15}/> Rename</button>
      <div className="context-separator"/>
      <button className="danger" onClick={()=>deleteCollection(collectionMenu.collection)}><Trash2 size={15}/> Delete collection</button>
    </div>}

    {savedSearchMenu && <div className="context-menu saved-search-menu" style={{left:Math.min(savedSearchMenu.x,window.innerWidth-250),top:Math.min(savedSearchMenu.y,window.innerHeight-150)}} onMouseDown={e=>e.stopPropagation()}>
      <div className="context-title"><BookmarkPlus size={14}/> {savedSearchMenu.saved.name}</div>
      <button onClick={()=>openSavedSearch(savedSearchMenu.saved)}><Search size={15}/> Run search</button>
      <button onClick={()=>renameSavedSearch(savedSearchMenu.saved)}><Pencil size={15}/> Rename</button>
      <div className="context-separator"/>
      <button className="danger" onClick={()=>deleteSavedSearch(savedSearchMenu.saved)}><Trash2 size={15}/> Delete</button>
    </div>}

    {folderMenu && <div className="context-menu folder-menu" style={{left:Math.min(folderMenu.x,window.innerWidth-250),top:Math.min(folderMenu.y,window.innerHeight-330)}} onMouseDown={e=>e.stopPropagation()}>
      <div className="context-title"><Folder size={14} style={{color:folderMenu.folder.color || undefined}}/> {folderMenu.folder.name}</div>
      <button onClick={()=>{setFolderMenu(null);createFolder(folderMenu.folder.id)}}><FolderInput size={15}/> New subfolder</button>
      <button onClick={()=>{setFolderMenu(null);renameFolder(folderMenu.folder)}}><Settings size={15}/> Rename</button>
      <div className="context-color-section">
        <div className="context-subtitle"><Palette size={14}/> Color</div>
        <div className="context-color-grid">{folderColors.map(c=>
          <button key={c.name} className={`context-color ${folderMenu.folder.color===c.value?"selected":""}`} title={c.name}
            onClick={()=>setFolderColor(folderMenu.folder.id,c.value)}>
            <span style={{background:c.css}}>{!c.value&&<X size={10}/>}</span>
          </button>
        )}</div>
      </div>
      <div className="context-separator"/>
      <button className="danger" onClick={()=>{setFolderModal(folderMenu.folder);setFolderMenu(null)}}><Trash2 size={15}/> Delete folder</button>
    </div>}

    {contextMenu && <div ref={contextMenuRef} className="context-menu" style={{left:contextPosition.left,top:contextPosition.top}}
      onMouseDown={e=>e.stopPropagation()}>
      <div className="context-title">{contextMenu.item.name}</div>
      {!contextMenu.item.demo && <button onClick={contextOpen}><ExternalLink size={15}/> Open</button>}
      {!contextMenu.item.demo && <button onClick={contextReveal}><FolderOpen size={15}/> Show in folder</button>}
      <button onClick={contextFavorite}><Heart size={15}/> {contextMenu.item.favorite?"Remove favorite":"Add to favorites"}</button>
      {!contextMenu.item.demo && <button onClick={()=>renameItem(contextMenu.item)}><Pencil size={15}/> Rename</button>}
      {!contextMenu.item.demo && <button onClick={()=>{setTagModal(contextMenu.item);setContextMenu(null)}}><Tag size={15}/> Edit tags</button>}
      {!contextMenu.item.demo && <button onClick={()=>openInfoEditor(contextMenu.item)}><Info size={15}/> Edit info</button>}
      {!contextMenu.item.demo && <button onClick={async()=>{setDb(await window.mediaVault.setItemsInbox([contextMenu.item.id],!contextMenu.item.inbox));setContextMenu(null);notify(contextMenu.item.inbox?"Removed from Inbox.":"Sent to Inbox.")}}>{contextMenu.item.inbox?<ArchiveRestore size={15}/>:<Inbox size={15}/>} {contextMenu.item.inbox?"Archive from Inbox":"Send to Inbox"}</button>}
      {!contextMenu.item.demo && <button onClick={()=>{openMetadata(contextMenu.item);setContextMenu(null)}}><Settings size={15}/> Details</button>}
      {!contextMenu.item.demo && <button onClick={()=>openCollectionPicker(selected.includes(contextMenu.item.id)?selected:[contextMenu.item.id])}><Bookmark size={15}/> Collections</button>}
      {!contextMenu.item.demo && <button onClick={()=>openFolderAction("copy", selected.includes(contextMenu.item.id)?selected:[contextMenu.item.id])}><Copy size={15}/> Copy to folder</button>}
      {!contextMenu.item.demo && <button onClick={()=>openFolderAction("move", selected.includes(contextMenu.item.id)?selected:[contextMenu.item.id])}><Move size={15}/> Move to folder</button>}
      {!contextMenu.item.demo && <div className="context-color-section"><div className="context-subtitle"><Palette size={14}/> Color</div><div className="context-color-grid">{itemColors.map(c=><button key={c.name} className={`context-color ${contextMenu.item.color===c.value?"selected":""}`} title={c.name} onClick={()=>{setColor([contextMenu.item.id],c.value);setContextMenu(null)}}><span style={{background:c.css}}>{!c.value&&<X size={10}/>}</span></button>)}</div></div>}
      {!contextMenu.item.demo && <div className="context-separator"/>}
      {!contextMenu.item.demo && <button className="danger" onClick={contextDelete}><Trash2 size={15}/> Delete</button>}
    </div>}

    {tagEditor && <Modal onClose={()=>setTagEditor(null)}>
      <div className="modal-head"><h2>Rename tag</h2><button className="icon-btn" onClick={()=>setTagEditor(null)}><X/></button></div>
      <input autoFocus className="modal-input" value={tagEditor.value} onChange={e=>setTagEditor({...tagEditor,value:e.target.value})} onMouseDown={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter"){e.preventDefault();saveTagEdit()}}}/>
      <div className="tag-color-editor"><div className="context-subtitle"><Palette size={14}/> Tag color</div><div className="context-color-grid">{tagColors.map(c=><button key={c.name} className={`context-color ${tagEditor.color===c.value?"selected":""}`} title={c.name} onClick={()=>setTagEditor({...tagEditor,color:c.value})}><span style={{background:c.css}}>{!c.value&&<X size={10}/>}</span></button>)}</div></div>
      <div className="modal-actions"><button onClick={()=>setTagEditor(null)}>Cancel</button><button onClick={saveTagEdit}><Check size={15}/> Save</button><button className="danger" onClick={async()=>{if(confirm("Delete this tag?")){setDb(await window.mediaVault.deleteTag(tagEditor.id));setTagEditor(null)}}}><Trash2 size={15}/> Delete</button></div>
    </Modal>}
  </div>;
}

createRoot(document.getElementById("root")).render(<AppErrorBoundary><App/></AppErrorBoundary>);