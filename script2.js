document.addEventListener("DOMContentLoaded", async () => {
  // Configuración de Supabase
  const SUPABASE_URL = "https://bbldcocvxmzztvkaowbd.supabase.co"
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibGRjb2N2eG16enR2a2Fvd2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1NDc5NDgsImV4cCI6MjA1OTEyMzk0OH0.JILUByfv8ZM1BiEjkmb0uDOd7e3m-MtgDW8XfC9FkRg"

  // Inicializar Supabase correctamente
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Elementos del DOM
  const playerInput = document.getElementById("player-input")
  const submitBtn = document.getElementById("submit-btn")
  const messageContainer = document.getElementById("message-container")

  // Estado del juego
  const gameState = {
    topClubs: [],
    leftClubs: [],
    gridAnswers: [],
    filledCells: new Set(),
  }

  // =====================================================
  // CONFIGURACIÓN DEL GRID - MODIFICA ESTOS VALORES
  // =====================================================

  // IDs de los clubes que aparecerán en la parte superior
  const TOP_CLUB_IDS = [1, 2, 3]

  // IDs de los clubes que aparecerán en la parte izquierda
  const LEFT_CLUB_IDS = [1, 2, 3]

  // Respuestas válidas para cada intersección
  // Formato: [fila][columna] = [array de apellidos]
  const MANUAL_ANSWERS = [
    // Fila 1
    [
      ["quispe", "neymar", "suarez"], // Celda (0,0)
      ["ronaldo", "benzema", "bale"], // Celda (0,1)
      ["lewandowski", "muller", "neuer"], // Celda (0,2)
    ],
    // Fila 2
    [
      ["mbappe", "di maria", "icardi"], // Celda (1,0)
      ["modric", "kroos", "casemiro"], // Celda (1,1)
      ["haaland", "gundogan", "de bruyne"], // Celda (1,2)
    ],
    // Fila 3
    [
      ["salah", "firmino", "mane"], // Celda (2,0)
      ["pedri", "gavi", "busquets"], // Celda (2,1)
      ["kane", "son", "lloris"], // Celda (2,2)
    ],
  ]

  // =====================================================
  // FIN DE LA CONFIGURACIÓN
  // =====================================================

  // Función para cargar los clubes por ID
  async function loadClubsById(topIds, leftIds) {
    try {
      // Obtener los clubes superiores
      const { data: topClubs, error: topError } = await supabase
        .from("club")
        .select("id_club, nombre, imagen_club")
        .in("id_club", topIds)

      if (topError) throw topError

      // Obtener los clubes izquierdos
      const { data: leftClubs, error: leftError } = await supabase
        .from("club")
        .select("id_club, nombre, imagen_club")
        .in("id_club", leftIds)

      if (leftError) throw leftError

      // Ordenar los clubes según el orden de los IDs proporcionados
      const sortedTopClubs = topIds.map((id) => topClubs.find((club) => club.id_club === id)).filter(Boolean)
      const sortedLeftClubs = leftIds.map((id) => leftClubs.find((club) => club.id_club === id)).filter(Boolean)

      // Guardar los clubes en el estado del juego
      gameState.topClubs = sortedTopClubs
      gameState.leftClubs = sortedLeftClubs

      // Mostrar los clubes en la interfaz
      displayClubs(sortedTopClubs, sortedLeftClubs)

      // Reiniciar el estado del juego
      gameState.filledCells = new Set()
      resetGridCells()

      return true
    } catch (error) {
      console.error("Error al cargar clubes por ID:", error)
      showMessage("Error al cargar los clubes. Verifica los IDs.", "error")
      return false
    }
  }

  // Función para cargar las respuestas manuales
  function loadManualAnswers(manualAnswers) {
    // Convertir las respuestas manuales al formato esperado
    const formattedAnswers = manualAnswers.map((row) =>
      row.map((cellAnswers) => cellAnswers.map((apellido) => ({ apellido: apellido.toLowerCase() }))),
    )

    // Guardar las respuestas en el estado del juego
    gameState.gridAnswers = formattedAnswers

    console.log("Respuestas manuales cargadas:", gameState.gridAnswers)
  }

  // Función para reiniciar las celdas del grid
  function resetGridCells() {
    const gridCells = document.querySelectorAll(".grid-cell")
    gridCells.forEach((cell) => {
      cell.classList.remove("filled", "correct")
      cell.removeAttribute("data-player")
    })
  }

  // Función para mostrar los clubes en la interfaz
  function displayClubs(topClubs, leftClubs) {
    // Mostrar clubes en la parte superior
    topClubs.forEach((club, index) => {
      const clubCell = document.getElementById(`top-${index + 1}`)
      const clubImage = clubCell.querySelector(".club-image")
      const clubName = clubCell.querySelector(".club-name")

      clubImage.style.backgroundImage = `url(${club.imagen_club})`
      clubName.textContent = club.nombre
    })

    // Mostrar clubes en la parte izquierda
    leftClubs.forEach((club, index) => {
      const clubCell = document.getElementById(`left-${index + 1}`)
      const clubImage = clubCell.querySelector(".club-image")
      const clubName = clubCell.querySelector(".club-name")

      clubImage.style.backgroundImage = `url(${club.imagen_club})`
      clubName.textContent = club.nombre
    })
  }

  // Función para verificar la respuesta del usuario
  function checkAnswer(input) {
    const apellido = input.trim().toLowerCase()

    if (!apellido) {
      showMessage("Por favor, ingresa un apellido", "error")
      return
    }

    let found = false

    // Recorrer todas las celdas del grid
    for (let row = 0; row < gameState.gridAnswers.length; row++) {
      for (let col = 0; col < gameState.gridAnswers[row].length; col++) {
        // Verificar si la celda ya está llena
        const cellKey = `${row}-${col}`
        if (gameState.filledCells.has(cellKey)) continue

        // Verificar si el apellido coincide con alguna respuesta
        const answers = gameState.gridAnswers[row][col]
        const matchingPlayer = answers.find((player) => player.apellido.toLowerCase() === apellido)

        if (matchingPlayer) {
          // Marcar la celda como correcta
          const cell = document.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`)
          cell.classList.add("filled", "correct")
          cell.setAttribute("data-player", matchingPlayer.apellido.toUpperCase())

          // Agregar la celda a las celdas llenas
          gameState.filledCells.add(cellKey)

          showMessage(`¡Correcto! ${matchingPlayer.apellido.toUpperCase()} es una respuesta válida.`, "success")
          found = true

          // Verificar si el juego ha terminado
          checkGameCompletion()
          break
        }
      }
      if (found) break
    }

    if (!found) {
      showMessage("Jugador no encontrado o ya utilizado. Intenta con otro apellido.", "error")
    }

    // Limpiar el input
    playerInput.value = ""
  }

  // Función para verificar si el juego ha terminado
  function checkGameCompletion() {
    const totalCells = gameState.gridAnswers.length * gameState.gridAnswers[0].length

    if (gameState.filledCells.size === totalCells) {
      showMessage("¡Felicidades! Has completado el grid.", "success")

      // Desactivar el input y el botón
      playerInput.disabled = true
      submitBtn.disabled = true
    }
  }

  // Función para mostrar mensajes
  function showMessage(message, type) {
    messageContainer.textContent = message
    messageContainer.className = "message-container"

    if (type) {
      messageContainer.classList.add(type)
    }

    // Limpiar el mensaje después de 3 segundos si es un error
    if (type === "error") {
      setTimeout(() => {
        messageContainer.textContent = ""
        messageContainer.className = "message-container"
      }, 3000)
    }
  }

  // Event listeners
  submitBtn.addEventListener("click", () => {
    checkAnswer(playerInput.value)
  })

  playerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      checkAnswer(playerInput.value)
    }
  })

  // Inicializar el juego
  async function initGame() {
    try {
      // Cargar los clubes usando los IDs configurados
      const clubsLoaded = await loadClubsById(TOP_CLUB_IDS, LEFT_CLUB_IDS)

      if (clubsLoaded) {
        // Cargar las respuestas manuales
        loadManualAnswers(MANUAL_ANSWERS)

        showMessage("¡Grid cargado! Ingresa un apellido para comenzar.", "success")
      }
    } catch (error) {
      console.error("Error al inicializar el juego:", error)
      showMessage("Error al inicializar el juego. Por favor, recarga la página.", "error")
    }
  }

  // Iniciar el juego
  initGame()
})
