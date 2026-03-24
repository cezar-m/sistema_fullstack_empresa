import db from "../config/db.js";

// Criar venda
export const criarVenda = async (req, res) => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const id_usuario = req.user?.id;
    if (!id_usuario) throw new Error("Usuário não autenticado");

    const { itens } = req.body;
    if (!Array.isArray(itens) || itens.length === 0) throw new Error("Itens obrigatórios");

    let total = 0;

    // Criar venda
    const vendaRes = await client.query(
      `INSERT INTO vendas (id_usuario, total, data_venda) VALUES ($1, 0, NOW()) RETURNING id`,
      [id_usuario]
    );
    const id_venda = vendaRes.rows[0].id;

    // Processar itens
    for (const item of itens) {
      const id_produto = parseInt(item.id_produto, 10);
      const quantidade = parseInt(item.quantidade, 10);

      if (!Number.isInteger(id_produto) || id_produto <= 0 || !Number.isInteger(quantidade) || quantidade <= 0) {
        throw new Error(`Produto ou quantidade inválidos: ${JSON.stringify(item)}`);
      }

      // Buscar produto
      const prodRes = await client.query(
        "SELECT id, nome, preco FROM produtos WHERE id=$1",
        [id_produto]
      );
      if (prodRes.rows.length === 0) throw new Error(`Produto ID ${id_produto} não encontrado`);
      const produto = prodRes.rows[0];

      // Verificar estoque
      const estoqueRes = await client.query(
        "SELECT quantidade FROM estoque WHERE id_produto=$1",
        [id_produto]
      );
      if (estoqueRes.rows.length === 0) throw new Error(`Produto "${produto.nome}" sem estoque`);
      if (quantidade > Number(estoqueRes.rows[0].quantidade)) throw new Error(`Estoque insuficiente para "${produto.nome}"`);

      const subtotal = Number(produto.preco) * quantidade;
      total += subtotal;

      // Inserir item da venda
      await client.query(
        "INSERT INTO itens_venda (id_venda, id_produto, quantidade, preco_unitario) VALUES ($1,$2,$3,$4)",
        [id_venda, id_produto, quantidade, Number(produto.preco)]
      );

      // Atualizar estoque
      await client.query(
        "UPDATE estoque SET quantidade = quantidade - $1 WHERE id_produto=$2",
        [quantidade, id_produto]
      );
    }

    // Atualizar total da venda
    await client.query("UPDATE vendas SET total=$1 WHERE id=$2", [total, id_venda]);
    await client.query("COMMIT");

    return res.json({ sucesso: true, id: id_venda, total });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("ERRO CRIAR VENDA:", err);
    return res.status(400).json({ erro: err.message });
  } finally {
    client.release();
  }
};

// Listar vendas
export const listarVendas = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT 
        v.id, v.total, v.data_venda,
        COALESCE(
          json_agg(
            json_build_object(
              'id_produto', p.id,
              'produto', p.nome,
              'imagem', p.imagem,
              'preco', iv.preco_unitario,
              'quantidade', iv.quantidade
            )
          ) FILTER (WHERE iv.id IS NOT NULL), '[]'
        ) AS itens
      FROM vendas v
      LEFT JOIN itens_venda iv ON iv.id_venda=v.id
      LEFT JOIN produtos p ON p.id=iv.id_produto
      WHERE v.id_usuario=$1
      GROUP BY v.id
      ORDER BY v.id DESC
      `,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("ERRO LISTAR VENDAS:", err);
    return res.status(500).json({ erro: "Erro ao listar vendas" });
  }
};
