import { closeHistory } from "@tiptap/pm/history";
import { act, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@tiptap/core";
import { emailEditorExtensions, RichEmailEditor } from "../packages/ui/src/rich-email-editor";
import { emailContent } from "../packages/ui/src/email-html";
import { useRef, useState } from "react";
import { EmailWorkspace, type EmailWorkspaceHandle } from "../apps/web/src/email-workspace";

// Exercise real editor/storage hooks without rendering the unrelated recipient grid.
function EditorWorkspace({ database = false }: { database?: boolean }) {
  const [tab, setTab] = useState("Templates");
  const ref = useRef<EmailWorkspaceHandle>(null);
  return <><button type="button" onClick={() => ref.current?.newMessage()}>New message</button>
    {["Templates", "Compose & Send"].map(name => <button type="button" role="tab" aria-selected={tab === name} key={name} onClick={() => setTab(name)}>{name}</button>)}
    <EmailWorkspace ref={ref} database={database} tab={tab} onTab={setTab} selected={new Set(["synthetic-recipient"])} />
  </>;
}
import { draftStoreKey, templateStoreKey } from "../apps/web/src/email-store";
import { blankDraft, starterTemplates } from "../apps/web/src/email-store";
import { useDatabaseEmailWorkspace } from "../apps/web/src/database-email-store";

beforeAll(()=>{
  // Geometry is absent in jsdom; browser layout checks are recorded separately.
  if(!Range.prototype.getClientRects)Range.prototype.getClientRects=()=>[] as unknown as DOMRectList;
  if(!Range.prototype.getBoundingClientRect)Range.prototype.getBoundingClientRect=()=>new DOMRect();
  if(!document.elementFromPoint)document.elementFromPoint=()=>null;
});
beforeEach(()=>{localStorage.removeItem(templateStoreKey);localStorage.removeItem(draftStoreKey);});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe("Actual Tiptap commands and BCS toolbar",()=>{
  it("preserves all formatting, lists, alignments, safe links and tokens in serialized HTML",()=>{
    const editor=new Editor({extensions:emailEditorExtensions(),content:'<p>Hello {{student_name}}</p>'});
    editor.commands.selectAll();editor.chain().toggleBold().toggleItalic().toggleUnderline().toggleStrike().setFontFamily('Georgia').setFontSize('24px').setColor('#236bff').setTextAlign('center').setLink({href:'https://example.com'}).run();
    const html=emailContent(editor.getHTML()).html;for(const fragment of ['<strong>','<em>','<u>','<s>','Georgia','24px','color:','text-align:center','https://example.com','{{student_name}}'])expect(html).toContain(fragment);
    editor.chain().unsetLink().unsetAllMarks().clearNodes().unsetTextAlign().run();expect(editor.getHTML()).not.toMatch(/strong|font-size|href/);
    editor.commands.toggleBulletList();expect(editor.getHTML()).toContain('<ul>');editor.view.dispatch(closeHistory(editor.state.tr));editor.commands.toggleOrderedList();expect(editor.getHTML()).toContain('<ol>');editor.commands.undo();expect(editor.getHTML()).toContain('<ul>');editor.commands.redo();expect(editor.getHTML()).toContain('<ol>');editor.destroy();
  });
  it("renders accessible toolbar controls, applies real commands, and rejects an unsafe link",async()=>{
    const user=userEvent.setup();const changed=vi.fn();render(<RichEmailEditor value={emailContent('<p>Demo</p>')} onChange={changed} />);
    const body=await screen.findByRole('textbox',{name:'Email body'});await user.click(body);await user.keyboard('{Control>}a{/Control}');
    await user.click(screen.getByRole('button',{name:'Bold (Ctrl+B)'}));await user.selectOptions(screen.getByRole('combobox',{name:'Font family'}),'Georgia');await user.selectOptions(screen.getByRole('combobox',{name:'Font size'}),'24px');
    expect(body.innerHTML).toContain('<strong>');expect(body.innerHTML).toContain('Georgia');expect(body.innerHTML).toContain('24px');
    await user.click(screen.getByRole('button',{name:'Insert or edit link'}));await user.click(screen.getByLabelText('HTTPS or mailto link'));await user.paste('javascript:alert(1)');await user.click(screen.getByRole('button',{name:'Apply link'}));expect(screen.getByRole('alert').textContent).toContain('blocked');expect(body.innerHTML).not.toContain('javascript:');
  });
  it("supports read-only mode and an expanded dialog with focus return",async()=>{
    const user=userEvent.setup();const view=render(<RichEmailEditor value={emailContent('<p>Demo</p>')} onChange={()=>undefined} readOnly />);const body=await screen.findByRole('textbox',{name:'Email body'});expect(body.getAttribute('contenteditable')).toBe('false');expect((screen.getByRole('button',{name:'Bold (Ctrl+B)'}) as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<RichEmailEditor value={emailContent('<p>Demo</p>')} onChange={()=>undefined} />);const trigger=screen.getByRole('button',{name:'Expand editor'});await user.click(trigger);expect(screen.getByRole('dialog',{name:'Focus email editor'})).toBeTruthy();await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(screen.getByRole('button',{name:'Expand editor'}));
  });
});

it("applies headings, each alignment and token insertion at the caret",()=>{
  const editor=new Editor({extensions:emailEditorExtensions(),content:'<p>Hello learner</p>'});
  for(const level of [1,2,3] as const){editor.commands.setHeading({level});expect(editor.getHTML()).toContain(`<h${level}`);}
  editor.commands.setParagraph();for(const align of ['left','center','right']){editor.commands.setTextAlign(align);expect(editor.getHTML()).toContain(`text-align: ${align}`);}
  editor.commands.setTextSelection(7);editor.commands.insertContent({type:'text',text:'{{course_name}}'});expect(emailContent(editor.getHTML()).plainText).toBe('Hello {{course_name}}learner');editor.destroy();
});
it("uses Ctrl+B/I/U shortcuts and preserves the editor selection",async()=>{
  const user=userEvent.setup();render(<RichEmailEditor value={emailContent('<p>Keyboard</p>')} onChange={()=>undefined} />);const body=await screen.findByRole('textbox',{name:'Email body'});await user.click(body);await user.keyboard('{Control>}a{/Control}{Control>}b{/Control}{Control>}i{/Control}{Control>}u{/Control}');for(const mark of ['<strong>','<em>','<u>'])expect(body.innerHTML).toContain(mark);
});

describe("Template and Compose workflows",()=>{
  it("creates, reloads, edits, duplicates, previews, applies and confirms deletion without network",async()=>{
    const fetchSpy=vi.spyOn(globalThis,'fetch');const sendSpy=vi.spyOn(XMLHttpRequest.prototype,'send');const user=userEvent.setup();let view=render(<EditorWorkspace />);
    await user.click(screen.getByRole('tab',{name:'Templates'}));await user.click(await screen.findByRole('button',{name:'Create template'}));
    await user.click(screen.getByLabelText('Template name *'));await user.paste('V2 local lesson');await user.click(screen.getByLabelText('Email subject *'));await user.paste('Hello learner');
    const editor=await screen.findByRole('textbox',{name:'Template email body'});await user.click(editor);await user.click(editor);await user.paste('Learning together');await user.keyboard('{Control>}a{/Control}');await user.click(screen.getByRole('button',{name:'Bold (Ctrl+B)'}));
    await user.click(screen.getByRole('button',{name:'Save template'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(screen.getByRole('heading',{name:'V2 local lesson'})).toBeTruthy();expect(localStorage.getItem(templateStoreKey)).toContain('<strong>');
    view.unmount();view=render(<EditorWorkspace />);await user.click(screen.getByRole('tab',{name:'Templates'}));const card=await screen.findByRole('heading',{name:'V2 local lesson'});const article=card.closest('article');expect(article).toBeTruthy();
    await user.click(within(article as HTMLElement).getByRole('button',{name:'Edit'}));await user.clear(screen.getByLabelText('Template name *'));await user.click(screen.getByLabelText('Template name *'));await user.paste('V2 updated lesson');await user.click(screen.getByRole('button',{name:'Save template'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
    const updated=screen.getByRole('heading',{name:'V2 updated lesson'}).closest('article') as HTMLElement;await user.click(within(updated).getByRole('button',{name:'Duplicate'}));expect(screen.getByRole('heading',{name:'V2 updated lesson (copy)'})).toBeTruthy();
    await user.click(within(updated).getByRole('button',{name:'Preview'}));expect(screen.getByRole('dialog').textContent).toContain('Learning together');await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Use in Compose'}));expect((screen.getByLabelText('Email subject') as HTMLInputElement).value).toBe('Hello learner');expect((await screen.findByRole('textbox',{name:'Email body'})).innerHTML).toContain('<strong>');
    await user.click(screen.getByRole('tab',{name:'Templates'}));await user.click(within(screen.getByRole('heading',{name:'V2 updated lesson (copy)'}).closest('article') as HTMLElement).getByRole('button',{name:'Delete'}));expect(screen.getByRole('dialog',{name:'Delete custom template?'})).toBeTruthy();await user.click(screen.getByRole('button',{name:'Delete template'}));expect(screen.queryByRole('heading',{name:'V2 updated lesson (copy)'})).toBeNull();expect(fetchSpy).not.toHaveBeenCalled();expect(sendSpy).not.toHaveBeenCalled();
  });
  it("retains a saved independent draft after tab switch/reload and protects unsaved new-message changes",async()=>{
    const user=userEvent.setup();let view=render(<EditorWorkspace />);await user.click(screen.getByRole('tab',{name:'Templates'}));await user.click((await screen.findAllByRole('button',{name:'Use in Compose'}))[0]);await screen.findByRole('textbox',{name:'Email body'});
    await user.clear(screen.getByLabelText('Email subject'));await user.click(screen.getByLabelText('Email subject'));await user.paste('Independent draft');await user.click(screen.getByRole('button',{name:'Save draft'}));await screen.findByText('Draft saved in this browser only — synthetic demo.');await user.click(screen.getByRole('tab',{name:'Templates'}));expect(screen.getByRole('heading',{name:'Class Schedule Confirmation'})).toBeTruthy();
    view.unmount();view=render(<EditorWorkspace />);await user.click(screen.getByRole('tab',{name:'Compose & Send'}));await waitFor(()=>expect((screen.getByLabelText('Email subject') as HTMLInputElement).value).toBe('Independent draft'));await user.click(screen.getByLabelText('Email subject'));await user.paste(' changed');await user.click(screen.getByRole('button',{name:'New message'}));expect(screen.getByRole('dialog',{name:'Start a new message?'})).toBeTruthy();await user.click(screen.getByRole('button',{name:'Keep editing'}));expect((screen.getByLabelText('Email subject') as HTMLInputElement).value).toContain('changed');
    await user.click(screen.getByRole('button',{name:'New message'}));await user.click(screen.getByRole('button',{name:'Discard changes'}));expect((screen.getByLabelText('Email subject') as HTMLInputElement).value).toBe('');
  });
  it("validates blank templates, confirms Escape discard and exposes corrupt storage warnings",async()=>{
    const user=userEvent.setup();const view=render(<EditorWorkspace />);await user.click(screen.getByRole('tab',{name:'Templates'}));await user.click(await screen.findByRole('button',{name:'Create template'}));await user.click(screen.getByRole('button',{name:'Save template'}));expect(screen.getByRole('alert').textContent).toContain('required');await user.click(screen.getByLabelText('Template name *'));await user.paste('Unsaved');await user.click(screen.getByRole('button',{name:'Expand editor'}));await user.keyboard('{Escape}');expect(screen.getByRole('dialog',{name:'Create email template'})).toBeTruthy();expect(screen.queryByRole('dialog',{name:'Discard template changes?'})).toBeNull();await user.keyboard('{Escape}');expect(screen.getByRole('dialog',{name:'Discard template changes?'})).toBeTruthy();await user.click(screen.getByRole('button',{name:'Discard changes'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());view.unmount();localStorage.setItem(templateStoreKey,'{bad');render(<EditorWorkspace />);await user.click(screen.getByRole('tab',{name:'Templates'}));expect((await screen.findByRole('alert')).textContent).toContain('not overwritten');expect(localStorage.getItem(templateStoreKey)).toBe('{bad');
  });
});


describe("Server-backed email persistence (mocked HTTP, no database)", () => {
  it("saves and reloads templates and drafts without writing browser storage", async () => {
    let templates: (ReturnType<typeof starterTemplates>[number] & { revision: number })[] = [];
    let draft: (ReturnType<typeof blankDraft> & { id: string; version: number }) | null = null;
    const requests: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      expect(url.startsWith("/api/bcs/app/documents")).toBe(true);
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)); requests.push(body);
        if (body.kind === "template") templates = [{ ...starterTemplates()[0], ...body, id: "custom-server-1", builtIn: false, revision: 1, content: emailContent(body.html) }];
        if (body.kind === "archive") templates = [];
        if (body.kind === "draft") draft = { ...blankDraft(), ...body, id: "draft-server-1", version: 1, content: emailContent(body.html) };
        return Response.json({ data: { id: "draft-server-1", version: 1 } });
      }
      return Response.json({ data: { templates, draft, drafts: draft ? [{ id: draft.id, subject: draft.subject, version: draft.version }] : [] } });
    }));
    const storage = vi.spyOn(Storage.prototype, "setItem");
    let hook = renderHook(() => useDatabaseEmailWorkspace(true));
    await waitFor(() => expect(hook.result.current.ready).toBe(true));
    await act(async () => { expect(await hook.result.current.saveTemplate({ ...starterTemplates()[0], id: "", name: "Server lesson", builtIn: false })).toBe(""); });
    expect(hook.result.current.templates.some(t => t.name === "Server lesson")).toBe(true);
    act(() => hook.result.current.setDraft({ ...blankDraft(), subject: "Server draft", content: emailContent("<p>Saved remotely</p>") }));
    await act(async () => { expect(await hook.result.current.saveDraft()).toBe(""); });
    expect(hook.result.current.dirty).toBe(false);
    hook.unmount(); hook = renderHook(() => useDatabaseEmailWorkspace(true));
    await waitFor(() => expect(hook.result.current.draft.subject).toBe("Server draft"));
    expect(hook.result.current.templates.some(t => t.name === "Server lesson")).toBe(true);
    await act(async () => { expect(await hook.result.current.deleteTemplate("custom-server-1")).toBe(""); });
    expect(requests.map(r => r.kind)).toEqual(["template", "draft", "archive"]);
    expect(hook.result.current.templates.some(t => t.name === "Server lesson")).toBe(false);
    expect(storage).not.toHaveBeenCalled();
    expect(localStorage.getItem(templateStoreKey)).toBeNull();
    expect(localStorage.getItem(draftStoreKey)).toBeNull();
  });
  it("fails closed when the document API is unavailable without local fallback", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: { code: "UNAVAILABLE" } }, { status: 503 })));
    const hook = renderHook(() => useDatabaseEmailWorkspace(true));
    await waitFor(() => expect(hook.result.current.warnings).toHaveLength(1));
    expect(hook.result.current.ready).toBe(false);
    expect(await hook.result.current.saveDraft()).toBe("Database unavailable. Not saved.");
    expect(localStorage.getItem(draftStoreKey)).toBeNull();
  });
});
