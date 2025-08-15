export type PageNode = {
  id: string;
  title: string;
  parentId: string | null;
  order?: number;
  isDeleted?: boolean;
};

export type BuiltTree = {
  roots: PageNode[];
  childrenByParent: Record<string, PageNode[]>;
};

/** Build roots + children map with stable sort (order, then title) */
export function buildPageTree(pages: PageNode[]): BuiltTree {
  const childrenByParent: Record<string, PageNode[]> = {};
  const roots: PageNode[] = [];

  // prefill buckets
  pages.forEach((p) => (childrenByParent[p.id] = childrenByParent[p.id] || []));

  pages.forEach((p) => {
    if (p.parentId) {
      childrenByParent[p.parentId] = childrenByParent[p.parentId] || [];
      childrenByParent[p.parentId].push(p);
    } else {
      roots.push(p);
    }
  });

  const sortArr = (arr: PageNode[]) =>
    arr.sort(
      (a, b) => ((a.order ?? 0) - (b.order ?? 0)) || a.title.localeCompare(b.title)
    );

  sortArr(roots);
  Object.values(childrenByParent).forEach(sortArr);

  return { roots, childrenByParent };
}

/** Order value between prev and next */
export function calcOrder(prev?: number, next?: number) {
  if (prev == null && next == null) return Date.now();
  if (prev == null) return (next ?? 0) - 1;
  if (next == null) return prev + 1;
  if (prev + 1 < next) return Math.floor((prev + next) / 2);
  return prev + 1;
}

/** Helpers for the top nav */
export function buildTree(pages: PageNode[]) {
  const byId = new Map<string, PageNode & { children: any[] }>();
  pages.forEach((p) => byId.set(p.id, { ...p, children: [] }));
  const roots: (PageNode & { children: any[] })[] = [];
  byId.forEach((p) => {
    if (p.parentId && byId.get(p.parentId)) {
      byId.get(p.parentId)!.children.push(p);
    } else {
      roots.push(p);
    }
  });
  const sortArr = (arr: any[]) =>
    arr.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || a.title.localeCompare(b.title));
  const dfs = (node: any) => { sortArr(node.children); node.children.forEach(dfs); };
  sortArr(roots); roots.forEach(dfs);
  return roots;
}

export function findParent(nodes: any[], id: string, parent?: any): any | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent;
    const res = findParent(n.children || [], id, n);
    if (res) return res;
  }
}





