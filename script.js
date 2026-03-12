const STORAGE_BASE = "autodiagnostico_base_custom";
const STORAGE_HIST = "autodiagnostico_historico";
const STORAGE_THEME = "autodiagnostico_theme";

const BASE_FALLBACK = {
    "carro nao liga": ["bateria fraca", "motor de arranque", "problema no alternador"],
    "carro nao da partida": ["bateria descarregada", "motor de arranque com defeito", "rele de partida com falha"],
    "barulho no freio": ["pastilha gasta", "disco empenado", "falta de lubrificacao"],
    "pedal de freio baixo": ["vazamento no sistema de freio", "ar no sistema hidraulico", "fluido de freio baixo"],
    "carro falhando": ["velas desgastadas", "problema na bobina", "combustivel ruim"],
    "motor engasgando": ["filtro de combustivel sujo", "bicos injetores sujos", "entrada de ar falsa"],
    "luz da bateria acesa": ["bateria fraca", "problema no alternador", "correia solta"],
    "carro treme quando acelera": ["velas", "bicos", "coxim do motor"],
    "luz de injecao acesa": ["sonda lambda com falha", "combustivel adulterado", "sensor map com defeito"],
    "consumo alto de combustivel": ["filtro de ar sujo", "bicos injetores desregulados", "sensor de oxigenio com defeito"],
    "cheiro de gasolina": ["vazamento na linha de combustivel", "tampa do tanque mal vedada", "canister saturado"],
    "motor esquentando": ["falta de aditivo no radiador", "valvula termostatica travada", "eletroventilador inoperante"],
    "vazamento de oleo": ["retentor ressecado", "junta da tampa de valvulas danificada", "bujao de carter frouxo"],
    "direcao pesada": ["fluido da direcao baixo", "bomba da direcao com desgaste", "correia da bomba frouxa"],
    "ar condicionado nao gela": ["gas refrigerante baixo", "compressor com falha", "filtro de cabine obstruido"],
    "fumaca branca no escape": ["entrada de agua na camara", "junta do cabecote danificada", "condensacao excessiva em motor frio"],
    "fumaca azul no escape": ["queima de oleo do motor", "aneis de pistao desgastados", "retentor de valvula comprometido"],
    "fumaca preta no escape": ["mistura rica de combustivel", "filtro de ar muito sujo", "sensor de temperatura com falha"],
    "barulho na suspensao": ["buchas desgastadas", "amortecedor com folga", "bieleta danificada"],
    "vibracao no volante": ["rodas desbalanceadas", "pneu deformado", "desalinhamento da direcao"],
    "luz do oleo acesa": ["nivel de oleo baixo", "bomba de oleo com falha", "sensor de pressao do oleo defeituoso"],
    "luz da temperatura acesa": ["superaquecimento do motor", "falta de liquido de arrefecimento", "sensor de temperatura com defeito"],
    "carro puxando para um lado": ["alinhamento fora do padrao", "calibragem irregular dos pneus", "problema no sistema de freio"],
    "chiado ao ligar": ["correia do alternador gasta", "polia desalinhada", "tensor frouxo"],
    "dificuldade para trocar marcha": ["embreagem desgastada", "nivel de oleo da caixa baixo", "trambulador desregulado"]
};

let baseProblemas = {};
let diagnosticoAtual = null;

const elProblema = document.getElementById("problema");
const elPlaca = document.getElementById("placa");
const elResultado = document.getElementById("resultado");
const elCausas = document.getElementById("causas-list");
const elResumoResultado = document.getElementById("resumo-resultado");
const elSintomasRelacionados = document.getElementById("sintomas-relacionados");
const elHistorico = document.getElementById("historico-list");
const elFiltro = document.getElementById("filtro-sintoma");
const elNovoSintoma = document.getElementById("novo-sintoma");
const elNovasCausas = document.getElementById("novas-causas");
const elBtnTema = document.getElementById("btn-tema");

const elBtnDiagnosticar = document.getElementById("btn-diagnosticar");
const elBtnSalvar = document.getElementById("btn-salvar");
const elBtnAdicionar = document.getElementById("btn-adicionar");
const elBtnLimpar = document.getElementById("btn-limpar");

function normalizarTexto(texto) {
    return (texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizarPlaca(texto) {
    return (texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

function carregarHistorico() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_HIST)) || [];
    } catch {
        return [];
    }
}

function salvarHistorico(lista) {
    localStorage.setItem(STORAGE_HIST, JSON.stringify(lista));
}

function carregarBaseCustom() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_BASE)) || {};
    } catch {
        return {};
    }
}

function salvarBaseCustom(base) {
    localStorage.setItem(STORAGE_BASE, JSON.stringify(base));
}

function carregarTema() {
    return localStorage.getItem(STORAGE_THEME) || "light";
}

function salvarTema(theme) {
    localStorage.setItem(STORAGE_THEME, theme);
}

function aplicarTema(theme) {
    document.body.setAttribute("data-theme", theme);
    elBtnTema.textContent = theme === "dark" ? "Tema claro" : "Tema escuro";
}

function alternarTema() {
    const atual = document.body.getAttribute("data-theme") || "light";
    const proximo = atual === "light" ? "dark" : "light";
    aplicarTema(proximo);
    salvarTema(proximo);
}

function renderCausas(causas) {
    elCausas.innerHTML = "";

    causas.forEach((causa) => {
        const li = document.createElement("li");
        li.textContent = causa;
        elCausas.appendChild(li);
    });
}

function formatarData(dateString) {
    const data = new Date(dateString);
    return data.toLocaleString("pt-BR");
}

function tokenizar(texto) {
    const stopWords = new Set(["de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "na", "no", "nas", "nos", "ao", "com"]);

    return normalizarTexto(texto)
        .split(" ")
        .map((item) => item.trim())
        .filter((item) => item && !stopWords.has(item));
}

function extrairConsultas(texto) {
    return normalizarTexto(texto)
        .split(/,|;|\n|\se\s/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

function calcularRelevancia(consulta, sintomaBase) {
    if (consulta === sintomaBase) {
        return 100;
    }

    if (sintomaBase.includes(consulta) || consulta.includes(sintomaBase)) {
        return 78;
    }

    const tokensConsulta = tokenizar(consulta);
    const tokensBase = tokenizar(sintomaBase);

    if (!tokensConsulta.length || !tokensBase.length) {
        return 0;
    }

    const baseSet = new Set(tokensBase);
    const intersecao = tokensConsulta.filter((token) => baseSet.has(token)).length;

    if (!intersecao) {
        return 0;
    }

    const percentual = intersecao / Math.max(tokensConsulta.length, tokensBase.length);
    return Math.round(percentual * 70);
}

function renderHistorico() {
    const termo = normalizarTexto(elFiltro.value);
    const historico = carregarHistorico();

    const filtrado = termo
        ? historico.filter((item) => normalizarTexto(item.problema).includes(termo))
        : historico;

    if (!filtrado.length) {
        elHistorico.innerHTML = '<p class="empty">Nenhum diagnostico encontrado.</p>';
        return;
    }

    elHistorico.innerHTML = filtrado
        .slice()
        .reverse()
        .map(
            (item) => `
                <article class="diagnostico-item">
                    <h4>${item.problema}</h4>
                    <p><strong>Placa:</strong> ${item.placa || "Nao informada"}</p>
                    <p><strong>Data:</strong> ${formatarData(item.data)}</p>
                    <p><strong>Causas:</strong> ${item.causas.join(" | ")}</p>
                </article>
            `
        )
        .join("");
}

function diagnosticarPorRelevancia(entrada) {
    const consultas = extrairConsultas(entrada);

    if (!consultas.length) {
        return { tipo: "nenhum", causas: [], sintomasRelacionados: [], resumo: "" };
    }

    const chaves = Object.keys(baseProblemas);
    const rankingSintomas = [];
    const mapaCausas = new Map();

    consultas.forEach((consulta) => {
        chaves.forEach((sintomaBase) => {
            const score = calcularRelevancia(consulta, sintomaBase);
            if (score < 28) {
                return;
            }

            rankingSintomas.push({ sintoma: sintomaBase, score });

            baseProblemas[sintomaBase].forEach((causa) => {
                const atual = mapaCausas.get(causa) || 0;
                mapaCausas.set(causa, atual + score);
            });
        });
    });

    if (!rankingSintomas.length) {
        return { tipo: "nenhum", causas: [], sintomasRelacionados: [], resumo: "" };
    }

    const sintomasRelacionados = [];
    const vistos = new Set();

    rankingSintomas
        .sort((a, b) => b.score - a.score)
        .forEach((item) => {
            if (!vistos.has(item.sintoma) && sintomasRelacionados.length < 5) {
                vistos.add(item.sintoma);
                sintomasRelacionados.push(item);
            }
        });

    const causas = Array.from(mapaCausas.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([causa, score]) => {
            let nivel = "baixa";
            if (score >= 130) {
                nivel = "alta";
            } else if (score >= 70) {
                nivel = "media";
            }

            return `${causa} (relevancia ${nivel})`;
        });

    const resumo = consultas.length > 1
        ? `Analise combinada de ${consultas.length} sintomas informados.`
        : "Analise baseada no sintoma informado.";

    return {
        tipo: "encontrado",
        causas,
        sintomasRelacionados,
        resumo
    };
}

function renderSintomasRelacionados(lista) {
    elSintomasRelacionados.innerHTML = "";

    if (!lista.length) {
        return;
    }

    lista.forEach((item) => {
        const span = document.createElement("span");
        span.className = "chip";
        span.textContent = `${item.sintoma} (${item.score}%)`;
        elSintomasRelacionados.appendChild(span);
    });
}

function diagnosticar() {
    const problemaOriginal = elProblema.value.trim();
    const placa = normalizarPlaca(elPlaca.value);

    if (!problemaOriginal) {
        alert("Digite um sintoma para diagnosticar.");
        return;
    }

    const busca = diagnosticarPorRelevancia(problemaOriginal);

    if (busca.tipo === "nenhum") {
        elResultado.hidden = false;
        elResumoResultado.textContent = "Nao houve correspondencia forte para os sintomas informados.";
        elSintomasRelacionados.innerHTML = "";
        renderCausas([
            "Nao encontramos esse sintoma na base atual.",
            "Use o formulario 'Adicionar novo sintoma' para ensinar o sistema.",
            "Leve o veiculo a um mecanico de confianca para avaliacao segura."
        ]);
        diagnosticoAtual = {
            problema: problemaOriginal,
            placa,
            causas: ["Sem diagnostico na base"],
            data: new Date().toISOString()
        };
        return;
    }

    elResultado.hidden = false;
    elResumoResultado.textContent = busca.resumo;
    renderSintomasRelacionados(busca.sintomasRelacionados);
    renderCausas(busca.causas);

    diagnosticoAtual = {
        problema: problemaOriginal,
        placa,
        causas: busca.causas,
        data: new Date().toISOString()
    };
}

function salvarDiagnosticoAtual() {
    if (!diagnosticoAtual) {
        alert("Faça um diagnostico antes de salvar.");
        return;
    }

    const historico = carregarHistorico();
    historico.push(diagnosticoAtual);
    salvarHistorico(historico);
    renderHistorico();

    alert("Diagnostico salvo no historico.");
}

function adicionarSintoma() {
    const sintoma = normalizarTexto(elNovoSintoma.value);
    const causas = elNovasCausas.value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    if (!sintoma || causas.length === 0) {
        alert("Preencha sintoma e pelo menos uma causa.");
        return;
    }

    const custom = carregarBaseCustom();
    custom[sintoma] = causas;
    salvarBaseCustom(custom);

    baseProblemas[sintoma] = causas;

    elNovoSintoma.value = "";
    elNovasCausas.value = "";

    alert("Novo sintoma adicionado com sucesso.");
}

function limparHistorico() {
    const confirmar = confirm("Deseja limpar todo o historico?");
    if (!confirmar) {
        return;
    }

    salvarHistorico([]);
    renderHistorico();
}

async function carregarBase() {
    let basePadrao = BASE_FALLBACK;

    try {
        const resposta = await fetch("dados/problemas.json");
        if (resposta.ok) {
            basePadrao = await resposta.json();
        }
    } catch {
        // Mantem fallback para uso local sem servidor
    }

    const baseCustom = carregarBaseCustom();

    baseProblemas = {
        ...basePadrao,
        ...baseCustom
    };
}

async function iniciar() {
    try {
        await carregarBase();
        renderHistorico();
    } catch (erro) {
        console.error("Erro ao carregar base de sintomas:", erro);
        alert("Nao foi possivel carregar os dados do sistema.");
    }

    elBtnDiagnosticar.addEventListener("click", diagnosticar);
    elBtnSalvar.addEventListener("click", salvarDiagnosticoAtual);
    elBtnAdicionar.addEventListener("click", adicionarSintoma);
    elBtnLimpar.addEventListener("click", limparHistorico);
    elBtnTema.addEventListener("click", alternarTema);
    elFiltro.addEventListener("input", renderHistorico);

    aplicarTema(carregarTema());

    elProblema.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            diagnosticar();
        }
    });
}

iniciar();
