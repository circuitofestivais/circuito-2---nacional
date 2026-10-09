import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
});

test("consulta, filtro persistente e detalhes", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Um mapa para fazer filmes circularem." })).toBeVisible();
  await expect(page.getByText("633 festivais", { exact: true }).first()).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Buscar em todos os campos e notas" });
  await search.fill("Festival Cine Deburu");
  await expect(page.locator(".festival-card")).toHaveCount(2);
  await expect.poll(() => new URL(page.url()).searchParams.get("busca")).toBe("Festival Cine Deburu");
  await page.reload();
  await expect(search).toHaveValue("Festival Cine Deburu");
  await expect(page.locator(".festival-card")).toHaveCount(2);
  await page.locator(".festival-card").first().getByRole("button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("N° — coluna B")).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar" }).click();
});

test("links preservados nas notas são clicáveis", async ({ page }) => {
  await page.goto("./?festival=festival-0078");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const link = dialog.getByRole("link", { name: "https://festivalpensarfilmes.com.br/primeiraedicao/" });
  await expect(link).toHaveAttribute("href", "https://festivalpensarfilmes.com.br/primeiraedicao/");
});

test("estado sem resultados pode ser limpo", async ({ page }) => {
  await page.getByRole("searchbox", { name: "Buscar em todos os campos e notas" }).fill("zzzz-sem-festival-zzzz");
  await expect(page.getByRole("heading", { name: "Nenhum festival encontrado" })).toBeVisible();
  await page.locator(".empty-state").getByRole("button", { name: "Limpar consulta" }).click();
  await expect(page.getByText("633 festivais", { exact: true }).first()).toBeVisible();
});

test("admin cria, edita, arquiva e restaura sem perder a versão anterior ao cancelar", async ({ page }) => {
  await page.goto("./#admin");
  await expect(page.getByRole("heading", { name: "Administração da base" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Adicionar festival/ })).toBeVisible();

  const firstRow = page.locator("tr[data-admin-id='festival-0001']");
  const originalName = (await firstRow.getByRole("rowheader").textContent())!;
  await firstRow.getByRole("button", { name: "Editar" }).click();
  const form = page.locator(".admin-form-dialog");
  await form.locator("#admin-field-name").fill("Nome que não deve ser salvo");
  await form.getByRole("button", { name: "Cancelar sem salvar" }).click();
  await expect(firstRow.getByRole("rowheader")).toHaveText(originalName);

  await page.getByRole("button", { name: /Adicionar festival/ }).click();
  await form.locator("#admin-field-name").fill("Festival de Teste Automatizado");
  await form.locator("#admin-field-groupNumber").fill("1");
  await form.locator("#admin-field-edition").fill("1ª");
  await form.locator("#admin-field-municipality").fill("Município de Teste");
  const requiredSelects = form.locator("select[aria-invalid='false'], select:not([aria-invalid='true'])");
  const count = await requiredSelects.count();
  for (let index = 0; index < count; index += 1) {
    const select = requiredSelects.nth(index);
    if ((await select.inputValue()) === "" && (await select.locator("option").count()) > 0) {
      const values = await select.locator("option").evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean));
      if (values[0]) await select.selectOption(values[0]);
    }
  }
  await form.getByRole("button", { name: "Salvar festival" }).click();
  await expect(page.getByText("Festival adicionado com sucesso.")).toBeVisible();
  const createdRow = page.getByRole("row", { name: /Festival de Teste Automatizado/ });
  await expect(createdRow).toBeVisible();
  await createdRow.getByRole("button", { name: "Arquivar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Mover para a lixeira" }).click();
  await page.getByRole("tab", { name: /Lixeira/ }).click();
  const archivedRow = page.getByRole("row", { name: /Festival de Teste Automatizado/ });
  await expect(archivedRow).toBeVisible();
  await archivedRow.getByRole("button", { name: "Restaurar" }).click();
  await page.getByRole("tab", { name: /Ativos/ }).click();
  await expect(page.getByRole("row", { name: /Festival de Teste Automatizado/ })).toBeVisible();
});
