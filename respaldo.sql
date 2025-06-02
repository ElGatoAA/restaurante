--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2 (Postgres.app)
-- Dumped by pg_dump version 17.2 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: actualizar_fecha_completada(); Type: FUNCTION; Schema: public; Owner: gatoaa
--

CREATE FUNCTION public.actualizar_fecha_completada() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.estado = 'completada' AND OLD.estado != 'completada' THEN
        NEW.fecha_completada = CURRENT_TIMESTAMP;
    ELSIF NEW.estado != 'completada' THEN
        NEW.fecha_completada = NULL;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_fecha_completada() OWNER TO gatoaa;

--
-- Name: actualizar_fecha_modificacion(); Type: FUNCTION; Schema: public; Owner: gatoaa
--

CREATE FUNCTION public.actualizar_fecha_modificacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_fecha_modificacion() OWNER TO gatoaa;

--
-- Name: actualizar_totales_orden(); Type: FUNCTION; Schema: public; Owner: gatoaa
--

CREATE FUNCTION public.actualizar_totales_orden() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    nuevo_subtotal DECIMAL(10,2);
    nuevos_impuestos DECIMAL(10,2);
    nuevo_total DECIMAL(10,2);
    orden_id_actual INTEGER;
BEGIN
    -- Determinar el orden_id según la operación
    IF TG_OP = 'DELETE' THEN
        orden_id_actual := OLD.orden_id;
    ELSE
        orden_id_actual := NEW.orden_id;
    END IF;
    
    -- Calcular totales
    SELECT COALESCE(SUM(subtotal), 0)
    INTO nuevo_subtotal
    FROM orden_items
    WHERE orden_id = orden_id_actual;
    
    nuevos_impuestos := nuevo_subtotal * 0.16; -- 16% de impuestos
    nuevo_total := nuevo_subtotal + nuevos_impuestos;
    
    -- Actualizar la orden
    UPDATE ordenes
    SET subtotal = nuevo_subtotal,
        impuestos = nuevos_impuestos,
        total = nuevo_total
    WHERE id = orden_id_actual;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION public.actualizar_totales_orden() OWNER TO gatoaa;

--
-- Name: generar_numero_orden(); Type: FUNCTION; Schema: public; Owner: gatoaa
--

CREATE FUNCTION public.generar_numero_orden() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.numero_orden IS NULL OR NEW.numero_orden = '' THEN
        NEW.numero_orden := 'ORD-' || LPAD(NEW.id::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.generar_numero_orden() OWNER TO gatoaa;

--
-- Name: limpiar_ordenes_completadas(); Type: FUNCTION; Schema: public; Owner: gatoaa
--

CREATE FUNCTION public.limpiar_ordenes_completadas() RETURNS TABLE(ordenes_eliminadas integer, total_ventas numeric, total_impuestos numeric)
    LANGUAGE plpgsql
    AS $$
DECLARE
    resultado RECORD;
BEGIN
    -- Obtener estadísticas antes de eliminar
    SELECT 
        COUNT(*) as count_ordenes,
        COALESCE(SUM(total), 0) as sum_ventas,
        COALESCE(SUM(impuestos), 0) as sum_impuestos
    INTO resultado
    FROM ordenes 
    WHERE estado = 'completada';
    
    -- Eliminar órdenes completadas (los items se eliminan automáticamente por CASCADE)
    DELETE FROM ordenes WHERE estado = 'completada';
    
    -- Reiniciar secuencias si es necesario
    -- TRUNCATE categorias, productos, ordenes RESTART IDENTITY CASCADE;
    
    -- Retornar estadísticas
    ordenes_eliminadas := resultado.count_ordenes;
    total_ventas := resultado.sum_ventas;
    total_impuestos := resultado.sum_impuestos;
    
    RETURN NEXT;
END;
$$;


ALTER FUNCTION public.limpiar_ordenes_completadas() OWNER TO gatoaa;

--
-- Name: obtener_siguiente_numero_orden(); Type: FUNCTION; Schema: public; Owner: gatoaa
--

CREATE FUNCTION public.obtener_siguiente_numero_orden() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    siguiente_id INTEGER;
BEGIN
    SELECT COALESCE(MAX(id), 0) + 1 INTO siguiente_id FROM ordenes;
    RETURN 'ORD-' || LPAD(siguiente_id::TEXT, 4, '0');
END;
$$;


ALTER FUNCTION public.obtener_siguiente_numero_orden() OWNER TO gatoaa;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categorias; Type: TABLE; Schema: public; Owner: gatoaa
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categorias OWNER TO gatoaa;

--
-- Name: TABLE categorias; Type: COMMENT; Schema: public; Owner: gatoaa
--

COMMENT ON TABLE public.categorias IS 'Tabla para almacenar las categorías de productos';


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: gatoaa
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorias_id_seq OWNER TO gatoaa;

--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: gatoaa
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: orden_items; Type: TABLE; Schema: public; Owner: gatoaa
--

CREATE TABLE public.orden_items (
    id integer NOT NULL,
    orden_id integer NOT NULL,
    producto_id integer NOT NULL,
    nombre_producto character varying(150) NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    cantidad integer NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT orden_items_cantidad_check CHECK ((cantidad > 0))
);


ALTER TABLE public.orden_items OWNER TO gatoaa;

--
-- Name: TABLE orden_items; Type: COMMENT; Schema: public; Owner: gatoaa
--

COMMENT ON TABLE public.orden_items IS 'Tabla de detalle de items por orden';


--
-- Name: orden_items_id_seq; Type: SEQUENCE; Schema: public; Owner: gatoaa
--

CREATE SEQUENCE public.orden_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orden_items_id_seq OWNER TO gatoaa;

--
-- Name: orden_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: gatoaa
--

ALTER SEQUENCE public.orden_items_id_seq OWNED BY public.orden_items.id;


--
-- Name: ordenes; Type: TABLE; Schema: public; Owner: gatoaa
--

CREATE TABLE public.ordenes (
    id integer NOT NULL,
    numero_orden character varying(20) NOT NULL,
    cliente_nombre character varying(100),
    mesa character varying(20),
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    impuestos numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_completada timestamp without time zone,
    CONSTRAINT ordenes_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'preparando'::character varying, 'completada'::character varying, 'cancelada'::character varying])::text[])))
);


ALTER TABLE public.ordenes OWNER TO gatoaa;

--
-- Name: TABLE ordenes; Type: COMMENT; Schema: public; Owner: gatoaa
--

COMMENT ON TABLE public.ordenes IS 'Tabla principal de órdenes';


--
-- Name: ordenes_id_seq; Type: SEQUENCE; Schema: public; Owner: gatoaa
--

CREATE SEQUENCE public.ordenes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ordenes_id_seq OWNER TO gatoaa;

--
-- Name: ordenes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: gatoaa
--

ALTER SEQUENCE public.ordenes_id_seq OWNED BY public.ordenes.id;


--
-- Name: productos; Type: TABLE; Schema: public; Owner: gatoaa
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    categoria_id integer NOT NULL,
    activo boolean DEFAULT true,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT productos_precio_check CHECK ((precio >= (0)::numeric))
);


ALTER TABLE public.productos OWNER TO gatoaa;

--
-- Name: TABLE productos; Type: COMMENT; Schema: public; Owner: gatoaa
--

COMMENT ON TABLE public.productos IS 'Tabla para almacenar los productos del menú';


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: gatoaa
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.productos_id_seq OWNER TO gatoaa;

--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: gatoaa
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: gatoaa
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    password_hash text NOT NULL
);


ALTER TABLE public.usuarios OWNER TO gatoaa;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: gatoaa
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuarios_id_seq OWNER TO gatoaa;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: gatoaa
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: vista_ordenes_completas; Type: VIEW; Schema: public; Owner: gatoaa
--

CREATE VIEW public.vista_ordenes_completas AS
 SELECT o.id,
    o.numero_orden,
    o.cliente_nombre,
    o.mesa,
    o.subtotal,
    o.impuestos,
    o.total,
    o.estado,
    o.fecha_creacion,
    o.fecha_completada,
    count(oi.id) AS total_items,
    sum(oi.cantidad) AS total_productos
   FROM (public.ordenes o
     LEFT JOIN public.orden_items oi ON ((o.id = oi.orden_id)))
  GROUP BY o.id, o.numero_orden, o.cliente_nombre, o.mesa, o.subtotal, o.impuestos, o.total, o.estado, o.fecha_creacion, o.fecha_completada;


ALTER VIEW public.vista_ordenes_completas OWNER TO gatoaa;

--
-- Name: vista_productos_con_categoria; Type: VIEW; Schema: public; Owner: gatoaa
--

CREATE VIEW public.vista_productos_con_categoria AS
 SELECT p.id,
    p.nombre,
    p.descripcion,
    p.precio,
    p.activo,
    c.nombre AS categoria_nombre,
    c.id AS categoria_id
   FROM (public.productos p
     JOIN public.categorias c ON ((p.categoria_id = c.id)));


ALTER VIEW public.vista_productos_con_categoria OWNER TO gatoaa;

--
-- Name: vista_productos_mas_vendidos; Type: VIEW; Schema: public; Owner: gatoaa
--

CREATE VIEW public.vista_productos_mas_vendidos AS
 SELECT oi.producto_id,
    oi.nombre_producto,
    sum(oi.cantidad) AS total_vendido,
    sum(oi.subtotal) AS total_ingresos,
    count(DISTINCT oi.orden_id) AS ordenes_incluidas
   FROM (public.orden_items oi
     JOIN public.ordenes o ON ((oi.orden_id = o.id)))
  WHERE ((o.estado)::text = 'completada'::text)
  GROUP BY oi.producto_id, oi.nombre_producto
  ORDER BY (sum(oi.cantidad)) DESC;


ALTER VIEW public.vista_productos_mas_vendidos OWNER TO gatoaa;

--
-- Name: vista_ventas_diarias; Type: VIEW; Schema: public; Owner: gatoaa
--

CREATE VIEW public.vista_ventas_diarias AS
 SELECT date(fecha_creacion) AS fecha,
    count(*) AS total_ordenes,
    sum(
        CASE
            WHEN ((estado)::text = 'completada'::text) THEN 1
            ELSE 0
        END) AS ordenes_completadas,
    sum(
        CASE
            WHEN ((estado)::text = 'completada'::text) THEN total
            ELSE (0)::numeric
        END) AS total_ventas,
    sum(
        CASE
            WHEN ((estado)::text = 'completada'::text) THEN subtotal
            ELSE (0)::numeric
        END) AS total_subtotal,
    sum(
        CASE
            WHEN ((estado)::text = 'completada'::text) THEN impuestos
            ELSE (0)::numeric
        END) AS total_impuestos,
        CASE
            WHEN (sum(
            CASE
                WHEN ((estado)::text = 'completada'::text) THEN 1
                ELSE 0
            END) > 0) THEN (sum(
            CASE
                WHEN ((estado)::text = 'completada'::text) THEN total
                ELSE (0)::numeric
            END) / (sum(
            CASE
                WHEN ((estado)::text = 'completada'::text) THEN 1
                ELSE 0
            END))::numeric)
            ELSE (0)::numeric
        END AS promedio_por_orden
   FROM public.ordenes
  GROUP BY (date(fecha_creacion))
  ORDER BY (date(fecha_creacion)) DESC;


ALTER VIEW public.vista_ventas_diarias OWNER TO gatoaa;

--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: orden_items id; Type: DEFAULT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.orden_items ALTER COLUMN id SET DEFAULT nextval('public.orden_items_id_seq'::regclass);


--
-- Name: ordenes id; Type: DEFAULT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.ordenes ALTER COLUMN id SET DEFAULT nextval('public.ordenes_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: gatoaa
--

COPY public.categorias (id, nombre, descripcion, activo, fecha_creacion, fecha_actualizacion) FROM stdin;
2	Platos Principales	Comida principal del menú	t	2025-06-01 17:41:57.400873	2025-06-01 17:41:57.400873
3	Postres	Dulces y postres	t	2025-06-01 17:41:57.400873	2025-06-01 17:41:57.400873
4	Entradas	Aperitivos y entradas	t	2025-06-01 17:41:57.400873	2025-06-01 17:41:57.400873
1	Bebidas	xdddd	t	2025-06-01 17:41:57.400873	2025-06-01 18:21:02.373522
\.


--
-- Data for Name: orden_items; Type: TABLE DATA; Schema: public; Owner: gatoaa
--

COPY public.orden_items (id, orden_id, producto_id, nombre_producto, precio_unitario, cantidad, subtotal, fecha_creacion) FROM stdin;
15	10	1	Coca Cola	25.00	1	25.00	2025-06-01 20:10:28.306564
\.


--
-- Data for Name: ordenes; Type: TABLE DATA; Schema: public; Owner: gatoaa
--

COPY public.ordenes (id, numero_orden, cliente_nombre, mesa, subtotal, impuestos, total, estado, fecha_creacion, fecha_completada) FROM stdin;
10	ORD-0010	admin		25.00	4.00	29.00	completada	2025-06-01 20:10:28.302988	2025-06-01 20:14:45.523476
\.


--
-- Data for Name: productos; Type: TABLE DATA; Schema: public; Owner: gatoaa
--

COPY public.productos (id, nombre, descripcion, precio, categoria_id, activo, fecha_creacion, fecha_actualizacion) FROM stdin;
1	Coca Cola	Refresco de cola 355ml	25.00	1	t	2025-06-01 17:41:57.401802	2025-06-01 17:41:57.401802
2	Agua Natural	Agua purificada 500ml	15.00	1	t	2025-06-01 17:41:57.401802	2025-06-01 17:41:57.401802
3	Hamburguesa Clásica	Hamburguesa con carne	85.00	2	t	2025-06-01 17:41:57.401802	2025-06-01 17:41:57.401802
4	Pizza Margherita	Pizza con tomate y mozzarella	120.00	2	t	2025-06-01 17:41:57.401802	2025-06-01 17:41:57.401802
5	Helado de Vainilla	Helado artesanal	35.00	3	t	2025-06-01 17:41:57.401802	2025-06-01 17:41:57.401802
6	Nachos	Nachos con queso	45.00	4	t	2025-06-01 17:41:57.401802	2025-06-01 17:41:57.401802
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: gatoaa
--

COPY public.usuarios (id, nombre, password_hash) FROM stdin;
1	Juan	password123
2	Maria	password456
3	Carlos	password789
4	xd	$2b$10$IrwqWwZDwJSG3ZdZvInnIeYXBxbtSziCigEUq9kb0rU3vtEF5VqXC
6	admin	$2b$10$iNINYQ19umdp8Y1xu4vOWu/1ORSKg745BO8fhSBWEp5L6BnvQFthW
5	xd2	admin
\.


--
-- Name: categorias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: gatoaa
--

SELECT pg_catalog.setval('public.categorias_id_seq', 6, true);


--
-- Name: orden_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: gatoaa
--

SELECT pg_catalog.setval('public.orden_items_id_seq', 15, true);


--
-- Name: ordenes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: gatoaa
--

SELECT pg_catalog.setval('public.ordenes_id_seq', 10, true);


--
-- Name: productos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: gatoaa
--

SELECT pg_catalog.setval('public.productos_id_seq', 7, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: gatoaa
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 6, true);


--
-- Name: categorias categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: orden_items orden_items_pkey; Type: CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_pkey PRIMARY KEY (id);


--
-- Name: ordenes ordenes_numero_orden_key; Type: CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_numero_orden_key UNIQUE (numero_orden);


--
-- Name: ordenes ordenes_pkey; Type: CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.ordenes
    ADD CONSTRAINT ordenes_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_orden_items_orden; Type: INDEX; Schema: public; Owner: gatoaa
--

CREATE INDEX idx_orden_items_orden ON public.orden_items USING btree (orden_id);


--
-- Name: idx_ordenes_estado; Type: INDEX; Schema: public; Owner: gatoaa
--

CREATE INDEX idx_ordenes_estado ON public.ordenes USING btree (estado);


--
-- Name: idx_ordenes_fecha; Type: INDEX; Schema: public; Owner: gatoaa
--

CREATE INDEX idx_ordenes_fecha ON public.ordenes USING btree (fecha_creacion);


--
-- Name: idx_productos_activo; Type: INDEX; Schema: public; Owner: gatoaa
--

CREATE INDEX idx_productos_activo ON public.productos USING btree (activo);


--
-- Name: idx_productos_categoria; Type: INDEX; Schema: public; Owner: gatoaa
--

CREATE INDEX idx_productos_categoria ON public.productos USING btree (categoria_id);


--
-- Name: ordenes trigger_actualizar_fecha_completada; Type: TRIGGER; Schema: public; Owner: gatoaa
--

CREATE TRIGGER trigger_actualizar_fecha_completada BEFORE UPDATE ON public.ordenes FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_completada();


--
-- Name: orden_items trigger_actualizar_totales_delete; Type: TRIGGER; Schema: public; Owner: gatoaa
--

CREATE TRIGGER trigger_actualizar_totales_delete AFTER DELETE ON public.orden_items FOR EACH ROW EXECUTE FUNCTION public.actualizar_totales_orden();


--
-- Name: orden_items trigger_actualizar_totales_insert; Type: TRIGGER; Schema: public; Owner: gatoaa
--

CREATE TRIGGER trigger_actualizar_totales_insert AFTER INSERT ON public.orden_items FOR EACH ROW EXECUTE FUNCTION public.actualizar_totales_orden();


--
-- Name: orden_items trigger_actualizar_totales_update; Type: TRIGGER; Schema: public; Owner: gatoaa
--

CREATE TRIGGER trigger_actualizar_totales_update AFTER UPDATE ON public.orden_items FOR EACH ROW EXECUTE FUNCTION public.actualizar_totales_orden();


--
-- Name: categorias trigger_categorias_fecha_actualizacion; Type: TRIGGER; Schema: public; Owner: gatoaa
--

CREATE TRIGGER trigger_categorias_fecha_actualizacion BEFORE UPDATE ON public.categorias FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();


--
-- Name: ordenes trigger_generar_numero_orden; Type: TRIGGER; Schema: public; Owner: gatoaa
--

CREATE TRIGGER trigger_generar_numero_orden BEFORE INSERT ON public.ordenes FOR EACH ROW EXECUTE FUNCTION public.generar_numero_orden();


--
-- Name: productos trigger_productos_fecha_actualizacion; Type: TRIGGER; Schema: public; Owner: gatoaa
--

CREATE TRIGGER trigger_productos_fecha_actualizacion BEFORE UPDATE ON public.productos FOR EACH ROW EXECUTE FUNCTION public.actualizar_fecha_modificacion();


--
-- Name: orden_items orden_items_orden_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_orden_id_fkey FOREIGN KEY (orden_id) REFERENCES public.ordenes(id) ON DELETE CASCADE;


--
-- Name: orden_items orden_items_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.orden_items
    ADD CONSTRAINT orden_items_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id);


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: gatoaa
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id);


--
-- PostgreSQL database dump complete
--

