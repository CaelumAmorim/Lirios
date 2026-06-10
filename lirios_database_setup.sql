-- ==========================================================
-- SCRIPT DE BANCO DE DADOS ATUALIZADO: LÍRIOS (POSTGRESQL)
-- Compatível com Supabase, PostgreSQL 12+ e Xano
-- ==========================================================

-- 1. LIMPEZA E CRIAÇÃO DAS TABELAS (Para fins de teste)
DROP TRIGGER IF EXISTS trg_apos_inserir_obra ON obras;
DROP FUNCTION IF EXISTS gerar_unidades_obra();
DROP TABLE IF EXISTS limpezas_concluidas CASCADE;
DROP TABLE IF EXISTS matriz_valores CASCADE;
DROP TABLE IF EXISTS unidades CASCADE;
DROP TABLE IF EXISTS alocacoes CASCADE;
DROP TABLE IF EXISTS obras CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Criar extensão para UUID se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de Usuários (Com perfil CEO adicionado)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) CHECK (perfil IN ('CEO', 'ADMIN', 'COLABORADOR')),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Obras (Agora com halls configuráveis)
CREATE TABLE obras (
    id PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    endereco TEXT,
    qtd_torres INTEGER NOT NULL CHECK (qtd_torres > 0),
    qtd_pavimentos INTEGER NOT NULL CHECK (qtd_pavimentos > 0),
    apts_por_pavimento INTEGER NOT NULL CHECK (apts_por_pavimento > 0),
    qtd_halls INTEGER NOT NULL DEFAULT 1 CHECK (qtd_halls >= 0),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Alocações
CREATE TABLE alocacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES users(id) ON DELETE CASCADE,
    data_alocacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de Unidades
CREATE TABLE unidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    torre VARCHAR(50) NOT NULL,
    pavimento INTEGER NOT NULL,
    unidade_nome VARCHAR(50) NOT NULL,
    tipo_unidade VARCHAR(20) CHECK (tipo_unidade IN ('APARTAMENTO', 'HALL'))
);

-- Criar tabela de Matriz de Valores (Com os 5 tipos de serviço de limpeza)
CREATE TABLE matriz_valores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    tipo_limpeza VARCHAR(30) CHECK (tipo_limpeza IN ('GROSSA', 'FINA', 'PESADA', 'PASSADA_DE_PANO', 'LAVAGEM_POS_FORMA')),
    valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT uq_obra_limpeza UNIQUE (obra_id, tipo_limpeza)
);

-- Criar tabela de Limpezas e Execuções (Agora com Início, Fim e Observações de Campo)
CREATE TABLE limpezas_concluidas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unidade_id UUID REFERENCES unidades(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    tipo_limpeza VARCHAR(30) CHECK (tipo_limpeza IN ('GROSSA', 'FINA', 'PESADA', 'PASSADA_DE_PANO', 'LAVAGEM_POS_FORMA')),
    data_inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMP, -- Nulo quando o serviço está "EM ANDAMENTO"
    valor_gerado DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Definido no momento do "Check" (Conclusão)
    observacao_canteiro TEXT,
    CONSTRAINT uq_unidade_servico UNIQUE (unidade_id, tipo_limpeza)
);

-- ==========================================================
-- 2. AUTOMAÇÃO: GERADOR DE ESTRUTURA FÍSICA (TRIGGER POSTGRES)
-- ==========================================================
CREATE OR REPLACE FUNCTION gerar_unidades_obra()
RETURNS TRIGGER AS $$
DECLARE
    t_index INTEGER;
    p_index INTEGER;
    a_index INTEGER;
    h_index INTEGER;
    apto_num INTEGER;
    nome_hall VARCHAR(50);
BEGIN
    -- Loop pelas Torres (ex: Torre 1, Torre 2)
    FOR t_index IN 1..NEW.qtd_torres LOOP
        -- Loop pelos Pavimentos (ex: 1º ao Nº andar)
        FOR p_index IN 1..NEW.qtd_pavimentos LOOP
            
            -- 2.1 Inserir os Apartamentos daquele andar
            FOR a_index IN 1..NEW.apts_por_pavimento LOOP
                apto_num := (p_index * 100) + a_index;
                
                INSERT INTO unidades(obra_id, torre, pavimento, unidade_nome, tipo_unidade)
                VALUES (NEW.id, 'Torre ' || t_index, p_index, 'Apto ' || apto_num, 'APARTAMENTO');
            END LOOP;
            
            -- 2.2 Inserir os Halls correspondentes daquele andar conforme configurado
            IF NEW.qtd_halls > 0 THEN
                FOR h_index IN 1..NEW.qtd_halls LOOP
                    IF NEW.qtd_halls = 1 THEN
                        nome_hall := 'Hall';
                    ELSE
                        nome_hall := 'Hall ' || h_index;
                    END IF;
                    
                    INSERT INTO unidades(obra_id, torre, pavimento, unidade_nome, tipo_unidade)
                    VALUES (NEW.id, 'Torre ' || t_index, p_index, nome_hall, 'HALL');
                END LOOP;
            END IF;
            
        END LOOP;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_apos_inserir_obra
AFTER INSERT ON obras
FOR EACH ROW
EXECUTE FUNCTION gerar_unidades_obra();

-- ==========================================================
-- 3. CARGA DE DADOS DE TESTE (MOCK DATA)
-- ==========================================================

-- Inserir equipe administrativa e colaboradores
INSERT INTO users (nome, username, senha_hash, perfil) VALUES
('Michele Santos', 'michelesantos', 'senha_ceo_hash', 'CEO'),
('Ana Admin', 'admin', 'senha_admin_hash', 'ADMIN'),
('Carlos Limpeza', 'carlos', 'senha_carlos_hash', 'COLABORADOR'),
('José Roberto', 'jose', 'senha_jose_hash', 'COLABORADOR');

-- Inserir uma Obra (2 Torres, 4 Andares, 4 Aptos e 1 Hall por andar)
-- Isso vai disparar o trigger e gerar: 2 * 4 * (4 aptos + 1 hall) = 40 unidades físicas automaticamente!
INSERT INTO obras (nome, endereco, qtd_torres, qtd_pavimentos, apts_por_pavimento, qtd_halls) VALUES
('Residencial Chapada Fontana', 'Av. das Flores, 120', 2, 4, 4, 1);

-- Inserir Matriz de Valores para os 5 serviços para a obra cadastrada
INSERT INTO matriz_valores (obra_id, tipo_limpeza, valor)
SELECT id, 'GROSSA', 120.00 FROM obras WHERE nome = 'Residencial Chapada Fontana'
UNION ALL
SELECT id, 'FINA', 180.00 FROM obras WHERE nome = 'Residencial Chapada Fontana'
UNION ALL
SELECT id, 'PESADA', 220.00 FROM obras WHERE nome = 'Residencial Chapada Fontana'
UNION ALL
SELECT id, 'PASSADA_DE_PANO', 50.00 FROM obras WHERE nome = 'Residencial Chapada Fontana'
UNION ALL
SELECT id, 'LAVAGEM_POS_FORMA', 90.00 FROM obras WHERE nome = 'Residencial Chapada Fontana';

-- Alocar colaboradores na Obra
INSERT INTO alocacoes (obra_id, usuario_id)
SELECT o.id, u.id FROM obras o, users u WHERE u.perfil = 'COLABORADOR';

-- Simular atividades de limpeza (Concluídas e Em Andamento)
-- Carlos concluiu a limpeza Grossa e Fina no Apto 101 da Torre 1
INSERT INTO limpezas_concluidas (unidade_id, usuario_id, tipo_limpeza, data_inicio, data_conclusao, valor_gerado, observacao_canteiro)
SELECT uni.id, usr.id, 'GROSSA', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', 120.00, 'Concluído'
FROM unidades uni, users usr
WHERE uni.unidade_nome = 'Apto 101' AND uni.torre = 'Torre 1' AND usr.username = 'carlos'
LIMIT 1;

INSERT INTO limpezas_concluidas (unidade_id, usuario_id, tipo_limpeza, data_inicio, data_conclusao, valor_gerado, observacao_canteiro)
SELECT uni.id, usr.id, 'FINA', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '10 minutes', 180.00, 'Faltou material para concluir metais'
FROM unidades uni, users usr
WHERE uni.unidade_nome = 'Apto 101' AND uni.torre = 'Torre 1' AND usr.username = 'carlos'
LIMIT 1;

-- José iniciou a Limpeza Pesada no Apto 102 da Torre 1, mas ela está "Em Andamento"
INSERT INTO limpezas_concluidas (unidade_id, usuario_id, tipo_limpeza, data_inicio, data_conclusao, valor_gerado, observacao_canteiro)
SELECT uni.id, usr.id, 'PESADA', NOW() - INTERVAL '30 minutes', NULL, 0.00, 'Em andamento'
FROM unidades uni, users usr
WHERE uni.unidade_nome = 'Apto 102' AND uni.torre = 'Torre 1' AND usr.username = 'jose'
LIMIT 1;
