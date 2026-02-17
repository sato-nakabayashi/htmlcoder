/********************
 * 定数
 ********************/
const TAGS = [
  "header",
  "nav",
  "main",
  "footer",
  "div",
  "section",
  "p",
  "ul",
  "li",
  "a",
  "img",
];

const BODY_ONLY = ["header", "nav", "main", "footer"];
const BODY_ORDER = ["header", "nav", "main", "footer"];

/********************
 * 状態
 ********************/
let idCounter = 1;
let root = null;
let selectedNode = null;

/********************
 * ノード生成
 ********************/
function createNode(tag, comment = "", className = "") {
  const node = {
    id: idCounter++,
    tag,
    comment,
    className,
    children: [],
  };

  // footerだけ特別処理
  if (tag === "footer") {
    node.children.push({
      id: idCounter++,
      tag: "div",
      comment: "copyright",
      children: [],
      className: "copyright", // 将来用
    });
  }

  return node;
}

/********************
 * 初期化
 ********************/
function init() {
  idCounter = 1;
  root = { tag: "body", children: [] };

  const mode = getTemplateMode();

  // 開始テンプレートありの場合
  if (mode === "full") {
    BODY_ORDER.forEach((tag) => {
      const node = createNode(tag);
      root.children.push(node);
    });
    selectedNode = root.children[2]; // main を初期選択
  } else {
    selectedNode = root;
  }

  renderTree();
}

/********************
 * 親取得
 ********************/
function findParent(node, target) {
  for (const child of node.children) {
    if (child === target) return node;
    const found = findParent(child, target);
    if (found) return found;
  }
  return null;
}

function getSuffix(comment) {
  const match = comment.match(/(-\d+(?:-\d+)*)$/);
  return match ? match[1] : "";
}

/********************
 * body直下存在確認
 ********************/
function hasBodyTag(tag) {
  return root.children.some((c) => c.tag === tag);
}

/********************
 * body順序チェック
 ********************/
function canInsertBodyTag(tag) {
  const targetIndex = BODY_ORDER.indexOf(tag);

  for (const child of root.children) {
    const idx = BODY_ORDER.indexOf(child.tag);
    if (idx > targetIndex) return false;
  }
  return true;
}

/********************
 * 追加モード取得
 ********************/
function getAddMode() {
  return document.querySelector('input[name="addMode"]:checked').value;
}

function getTemplateMode() {
  return document.querySelector('input[name="templateMode"]:checked').value;
}

function useBootstrap() {
  const checkbox = document.getElementById("useBootstrap");
  return checkbox ? checkbox.checked : false;
}

/********************
 * タグ追加
 ********************/
function addTag(tag) {
  const comment = prompt(`${tag} の説明（任意）`, "");
  const className = prompt(`${tag} の class 名（任意）`, "");
  const mode = getAddMode();

  /** li制約 **/
  if (tag === "li") {
    if (mode === "child" && selectedNode.tag !== "ul") return;
    if (mode === "sibling") {
      const parent = findParent(root, selectedNode);
      if (!parent || parent.tag !== "ul") return;
    }
  }

  /** body直下専用 **/
  if (BODY_ONLY.includes(tag)) {
    if (hasBodyTag(tag)) return;
    if (!canInsertBodyTag(tag)) return;

    const node = createNode(tag, comment, className);
    root.children.push(node);
    selectedNode = node;
    renderTree();
    return;
  }

  const node = createNode(tag, comment, className);

  /** 子として追加 **/
  if (mode === "child") {
    selectedNode.children.push(node);
    selectedNode = node;
    renderTree();
    return;
  }

  /** 同階層に追加 **/
  const parent = findParent(root, selectedNode);
  if (!parent) return;

  parent.children.push(node);
  selectedNode = node;
  renderTree();
}

/********************
 * 削除
 ********************/
function deleteSelected() {
  if (!selectedNode || selectedNode === root) return;

  const parent = findParent(root, selectedNode);
  parent.children = parent.children.filter((c) => c !== selectedNode);
  selectedNode = parent;
  renderTree();
}

/********************
 * 移動
 ********************/
function moveSelected(direction) {
  if (!selectedNode || selectedNode === root) return;

  const parent = findParent(root, selectedNode);
  const idx = parent.children.indexOf(selectedNode);
  const targetIdx = idx + direction;

  if (targetIdx < 0 || targetIdx >= parent.children.length) return;

  [parent.children[idx], parent.children[targetIdx]] = [
    parent.children[targetIdx],
    parent.children[idx],
  ];

  renderTree();
}

/********************
 * コメントアウト編集（ボタン用）
 ********************/
function editSelectedComment() {
  if (!selectedNode || selectedNode === root) return;

  const current = selectedNode.comment || "";
  const next = prompt("コメントを編集してください", current);

  // キャンセル時は何もしない
  if (next === null) return;

  selectedNode.comment = next.trim();
  renderTree();
}

/********************
 * 複製
 ********************/

function duplicateSelected() {
  if (!selectedNode || selectedNode === root) return;

  const parent = findParent(root, selectedNode);
  if (!parent) return;

  const index = parent.children.indexOf(selectedNode);

  duplicateNode(parent, index);

  selectedNode = parent.children[index + 1];
  renderTree();
}

function duplicateNode(parent, index) {
  const original = parent.children[index];
  const cloned = structuredClone(original);

  // ベース名（-数字を除去）
  const baseComment = original.comment
    ? original.comment.replace(/-\d+$/, "")
    : "";

  // 同じタグ＆同じベース名の兄弟数
  const sameSiblings = parent.children.filter(
    (c) =>
      c.tag === original.tag &&
      c.comment &&
      c.comment.replace(/-\d+$/, "") === baseComment
  );

  const nextNo = sameSiblings.length + 1;

  applySimpleSuffix(cloned, nextNo);

  parent.children.splice(index + 1, 0, cloned);
}

function applySimpleSuffix(node, no) {
  if (node.comment) {
    const base = node.comment.replace(/-\d+$/, "");
    node.comment = `${base}-${no}`;
  }

  node.children.forEach((child) => {
    applySimpleSuffix(child, no);
  });
}

/********************
 * 階層移動（インデント / アウトデント）
 ********************/

// 中に入れる（直前の兄弟の子にする）
function indentSelected() {
  if (!selectedNode || selectedNode === root) return;

  const parent = findParent(root, selectedNode);
  if (!parent) return;

  const idx = parent.children.indexOf(selectedNode);
  if (idx <= 0) return; // 直前の兄弟がいない

  const prevSibling = parent.children[idx - 1];

  // 親から外す
  parent.children.splice(idx, 1);

  // 直前兄弟の子に入れる
  prevSibling.children.push(selectedNode);

  renderTree();
}

// 外に出す（親の兄弟にする）
function outdentSelected() {
  if (!selectedNode || selectedNode === root) return;

  const parent = findParent(root, selectedNode);
  if (!parent || parent === root) return;

  const grandParent = findParent(root, parent);
  if (!grandParent) return;

  // 親から外す
  parent.children = parent.children.filter((c) => c !== selectedNode);

  // 親の直後に挿入
  const parentIdx = grandParent.children.indexOf(parent);
  grandParent.children.splice(parentIdx + 1, 0, selectedNode);

  renderTree();
}

/********************
 * ツリー描画
 ********************/
function renderTree() {
  const pre = document.getElementById("treeView");
  pre.innerHTML = "";
  root.children.forEach((node) => renderNode(pre, node, 0));
}

function renderNode(container, node, indent) {
  const line = document.createElement("div");
  line.className = "tree-line";

  line.textContent =
    `${"  ".repeat(indent)}${node.tag}` +
    (node.comment ? `　${node.comment}` : "") +
    (node.className ? `　.${node.className}` : "");

  if (node === selectedNode) line.classList.add("selected");

  // クリック：選択のみ（再描画しない）
  line.onclick = (e) => {
    e.stopPropagation();
    selectedNode = node;
    renderTree();
  };

  // ダブルクリック：コメント/class名編集
  line.ondblclick = (e) => {
    e.stopPropagation();

    const newComment = prompt(
      `${node.tag} のコメントを編集`,
      node.comment || ""
    );

    if (newComment === null) return;

    const newClass = prompt(
      `${node.tag} の class 名を編集`,
      node.className || ""
    );

    node.comment = newComment.trim();
    node.className = newClass ? newClass.trim() : "";

    renderTree();
  };

  container.appendChild(line);

  node.children.forEach((child) => renderNode(container, child, indent + 1));
}

/********************
 * HTML生成
 ********************/
function generateHTML(node, indent = 0) {
  let space = "  ".repeat(indent);
  let html = "";

  node.children.forEach((child) => {
    // start コメント
    if (child.comment) {
      html += `${space}<!-- ${child.comment} start -->\n`;
    }

    // 属性組み立て
    let attrs = "";

    if (child.className) {
      attrs += ` class="${child.className}"`;
    }

    if (child.tag === "a") {
      attrs += ' href="#"';
    }

    if (child.attrs) {
      Object.entries(child.attrs).forEach(([key, value]) => {
        attrs += ` ${key}="${value}"`;
      });
    }

    // a タグ（リンク用）
    if (child.tag === "a") {
      const commentText = child.comment ?? "リンク";

      html += `${space}<a${attrs}>${commentText}のリンクを入れる</a>\n`;

      if (child.comment) {
        html += `${space}<!-- ${child.comment} end -->\n`;
      }
      return;
    }

    // img は自己終了タグ
    if (child.tag === "img") {
      const commentText = child.comment ?? "画像";

      html += `${space}<img${attrs} src="${commentText}の画像を入れる" alt="${commentText}">\n`;

      if (child.comment) {
        html += `${space}<!-- ${child.comment} end -->\n`;
      }
      return;
    }

    // 通常タグ
    html += `${space}<${child.tag}${attrs}>\n`;

    // 子要素
    html += generateHTML(child, indent + 1);

    // 終了タグ
    html += `${space}</${child.tag}>\n`;

    // end コメント
    if (child.comment) {
      html += `${space}<!-- ${child.comment} end -->\n`;
    }
  });

  return html;
}

/********************
 * イベント
 ********************/
document.addEventListener("DOMContentLoaded", () => {
  const tagArea = document.getElementById("tagButtons");
  TAGS.forEach((tag) => {
    const btn = document.createElement("button");
    btn.textContent = tag;
    btn.onclick = () => addTag(tag);
    tagArea.appendChild(btn);
  });

  init();

  // 開始テンプレート切替時は初期化し直す
  document.querySelectorAll('input[name="templateMode"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      init();
    });
  });

  document.getElementById("resetBtn").onclick = init;
  document.getElementById("deleteBtn").onclick = deleteSelected;
  document.getElementById("upBtn").onclick = () => moveSelected(-1);
  document.getElementById("downBtn").onclick = () => moveSelected(1);
  document.getElementById("indentBtn").onclick = indentSelected;
  document.getElementById("outdentBtn").onclick = outdentSelected;
  document.getElementById("duplicateBtn").onclick = duplicateSelected;
  document.getElementById("editCommentBtn").onclick = editSelectedComment;

  document.getElementById("generateBtn").onclick = () => {
    const bodyHTML = generateHTML(root).trim();
    const mode = getTemplateMode();
    const bootstrap = useBootstrap();

    const bootstrapLink = bootstrap
      ? `  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" />\n`
      : "";

    if (mode === "full") {

  const ressLink =
    `  <link rel="stylesheet" href="https://unpkg.com/ress@4.0.0/dist/ress.min.css"/>\n`;

  const styleLink =
    `  <link rel="stylesheet" href="style.css" />\n`;

  document.getElementById("output").value = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title></title>
${ressLink}${styleLink}${bootstrapLink}</head>
<body>
${bodyHTML}
</body>
</html>`;
}
 else {
      document.getElementById("output").value = bodyHTML;
    }
  };
});

