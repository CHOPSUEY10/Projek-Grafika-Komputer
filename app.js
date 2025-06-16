const wireframeCanvas = document.getElementById("wireframeCanvas");
      const hiddenCanvas = document.getElementById("hiddenCanvas");
      const wireframeCtx = wireframeCanvas.getContext("2d");
      const hiddenCtx = hiddenCanvas.getContext("2d");

      // Vertex balok 3D (x, y, z) - balok dengan proporsi berbeda
      const originalVertices = [
        [-80, -40, -30], // 0: belakang kiri bawah
        [80, -40, -30], // 1: belakang kanan bawah
        [80, 40, -30], // 2: belakang kanan atas
        [-80, 40, -30], // 3: belakang kiri atas
        [-80, -40, 30], // 4: depan kiri bawah
        [80, -40, 30], // 5: depan kanan bawah
        [80, 40, 30], // 6: depan kanan atas
        [-80, 40, 30], // 7: depan kiri atas
      ];

      // Garis penghubung antar vertex
      const edges = [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0], // belakang
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4], // depan
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7], // penghubung
      ];

      // Permukaan (faces) dengan urutan counter-clockwise
      const faces = [
        [0, 1, 2, 3], // belakang
        [5, 4, 7, 6], // depan
        [4, 0, 3, 7], // kiri
        [1, 5, 6, 2], // kanan
        [3, 2, 6, 7], // atas
        [4, 5, 1, 0], // bawah
      ];

      // Warna greyscale untuk setiap permukaan
      const faceColors = [
        "#cccccc", // belakang (light grey)
        "#ffffff", // depan (white)
        "#888888", // kiri (medium grey)
        "#aaaaaa", // kanan (light medium grey)
        "#666666", // atas (dark grey)
        "#444444", // bawah (darker grey)
      ];

      let rotationX = 20,
        rotationY = 15,
        rotationZ = 0;
      let showWireframe = true;

      // Fungsi konversi derajat ke radian
      const degToRad = (deg) => (deg * Math.PI) / 180;

      // Fungsi rotasi pada sumbu X
      const rotatePointX = (p, a) => {
        const rad = degToRad(a);
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
      };

      // Fungsi rotasi pada sumbu Y
      const rotatePointY = (p, a) => {
        const rad = degToRad(a);
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
      };

      // Fungsi rotasi pada sumbu Z
      const rotatePointZ = (p, a) => {
        const rad = degToRad(a);
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
      };

      // Proyeksi 3D ke 2D untuk ditampilkan di canvas
      const project3DTo2D = (p, w, h) => [
        w / 2 + p[0] * 2.5,
        h / 2 - p[1] * 2.5,
      ];

      // Transformasi semua vertex dengan rotasi saat ini
      function transformVertices() {
        return originalVertices.map((v) => {
          let rotated = [...v];
          rotated = rotatePointX(rotated, rotationX);
          rotated = rotatePointY(rotated, rotationY);
          rotated = rotatePointZ(rotated, rotationZ);
          return rotated;
        });
      }

      // Menghitung normal vector untuk permukaan
      const calculateNormal = (face, vertices) => {
        const v0 = vertices[face[0]];
        const v1 = vertices[face[1]];
        const v2 = vertices[face[2]];

        // Vektor dari v0 ke v1 dan v0 ke v2
        const u = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]];
        const v = [v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2]];

        // Cross product u dan v
        const normal = [
          u[1] * v[2] - u[2] * v[1],
          u[2] * v[0] - u[0] * v[2],
          u[0] * v[1] - u[1] * v[0],
        ];

        // Normalisasi vector
        const length = Math.sqrt(
          normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]
        );
        if (length < 0.000001) return [0, 0, 0]; // Hindari division by zero

        return [normal[0] / length, normal[1] / length, normal[2] / length];
      };

      // Menggambar wireframe
      function drawWireframe(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;

        const verts = transformVertices().map((v) =>
          project3DTo2D(v, ctx.canvas.width, ctx.canvas.height)
        );

        edges.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(verts[a][0], verts[a][1]);
          ctx.lineTo(verts[b][0], verts[b][1]);
          ctx.stroke();
        });
      }

      // Menggambar permukaan dengan hidden surface removal
      function drawHiddenSurface(ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        const verts3D = transformVertices();
        const proj2D = verts3D.map((v) =>
          project3DTo2D(v, ctx.canvas.width, ctx.canvas.height)
        );

        // Siapkan data permukaan
        const faceData = faces
          .map((face, i) => {
            const normal = calculateNormal(face, verts3D);
            // Permukaan terlihat jika normal mengarah ke kamera (z > 0)
            const isVisible = normal[2] > 0;
            // Kedalaman rata-rata untuk depth sorting
            const avgZ =
              face.reduce((sum, idx) => sum + verts3D[idx][2], 0) / face.length;

            return {
              face: face,
              normal: normal,
              isVisible: isVisible,
              avgZ: avgZ,
              color: faceColors[i],
            };
          })
          .filter((data) => data.isVisible);

        // Urutkan permukaan dari yang paling jauh ke dekat
        faceData.sort((a, b) => a.avgZ - b.avgZ);

        // Gambar setiap permukaan
        faceData.forEach((data) => {
          const face = data.face;
          ctx.fillStyle = data.color;

          ctx.beginPath();
          ctx.moveTo(proj2D[face[0]][0], proj2D[face[0]][1]);
          for (let i = 1; i < face.length; i++) {
            ctx.lineTo(proj2D[face[i]][0], proj2D[face[i]][1]);
          }
          ctx.closePath();
          ctx.fill();

          // Gambar outline
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      // Render tampilan berdasarkan mode
      function render() {
        if (showWireframe) {
          wireframeCanvas.style.display = "block";
          hiddenCanvas.style.display = "none";
          drawWireframe(wireframeCtx);
        } else {
          wireframeCanvas.style.display = "none";
          hiddenCanvas.style.display = "block";
          drawHiddenSurface(hiddenCtx);
        }

        // Update status rotasi
        document.getElementById("rotX").textContent = rotationX;
        document.getElementById("rotY").textContent = rotationY;
        document.getElementById("currentMode").textContent = showWireframe
          ? "Wireframe"
          : "Hidden Surface";
      }

      // Fungsi rotasi
      function rotateX(a) {
        rotationX = (rotationX + a) % 360;
        render();
      }
      function rotateY(a) {
        rotationY = (rotationY + a) % 360;
        render();
      }
      function rotateZ(a) {
        rotationZ = (rotationZ + a) % 360;
        render();
      }

      // Toggle antara mode wireframe dan hidden surface
      function toggleMode() {
        showWireframe = !showWireframe;
        document.getElementById("modeText").textContent = showWireframe
          ? "Wireframe"
          : "Hidden Surface";
        render();
      }

      // Reset rotasi ke posisi awal
      function resetRotation() {
        rotationX = 20;
        rotationY = 15;
        rotationZ = 0;
        render();
      }

      // Event listener untuk keyboard
      document.addEventListener("keydown", (e) => {
        const key = e.key.toLowerCase();
        if (key === "w") rotateX(-5);
        else if (key === "s") rotateX(5);
        else if (key === "a") rotateY(5); // DIPERBAIKI: A sekarang rotasi kiri
        else if (key === "d")
          rotateY(-5); // DIPERBAIKI: D sekarang rotasi kanan
        else if (key === "r") resetRotation();
        else if (key === "m") toggleMode();
      });

      // Render awal
      render();