package com.licitaciones.sistema.service;

import com.licitaciones.sistema.entity.Auditoria;
import com.licitaciones.sistema.entity.Usuario;
import com.licitaciones.sistema.repository.AuditoriaRepository;
import com.licitaciones.sistema.security.services.UserDetailsImpl;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AuditoriaService {

    @Autowired
    private AuditoriaRepository auditoriaRepository;

    @Transactional
    public void registrarAccion(String accion, String modulo, String descripcion) {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        Auditoria.AuditoriaBuilder builder = Auditoria.builder()
                .accion(accion)
                .modulo(modulo)
                .descripcion(descripcion)
                .fecha(LocalDateTime.now())
                .ip(request.getRemoteAddr())
                .userAgent(request.getHeader("User-Agent"));

        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals("anonymousUser")) {
            Object principal = auth.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
                org.springframework.security.core.userdetails.UserDetails userDetails = (org.springframework.security.core.userdetails.UserDetails) principal;
                builder.username(userDetails.getUsername());
            } else {
                builder.username(principal.toString());
            }
            if (!auth.getAuthorities().isEmpty()) {
                builder.rolUsuario(auth.getAuthorities().iterator().next().getAuthority());
            } else {
                builder.rolUsuario("ROLE_USER");
            }
        } else {
            builder.username("Sistema/Anon");
            builder.rolUsuario("N/A");
        }

        auditoriaRepository.save(builder.build());
    }

    public Page<Auditoria> buscarAuditorias(Specification<Auditoria> spec, Pageable pageable) {
        return auditoriaRepository.findAll(spec, pageable);
    }

    public List<Auditoria> buscarTodas(Specification<Auditoria> spec) {
        return auditoriaRepository.findAll(spec);
    }

    public ByteArrayInputStream exportToExcel(List<Auditoria> data) throws IOException {
        String[] columns = {"ID", "Usuario", "Rol", "Acción", "Módulo", "Descripción", "Fecha", "IP"};
        
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Auditoria");
            
            // Header font and style
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            
            CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setFillForegroundColor(IndexedColors.BLUE_GREY.getIndex());
            headerCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Create Header Row
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            for (int col = 0; col < columns.length; col++) {
                org.apache.poi.ss.usermodel.Cell cell = headerRow.createCell(col);
                cell.setCellValue(columns[col]);
                cell.setCellStyle(headerCellStyle);
            }

            // Fill Data
            int rowIdx = 1;
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            for (Auditoria aud : data) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(aud.getId());
                row.createCell(1).setCellValue(aud.getUsername());
                row.createCell(2).setCellValue(aud.getRolUsuario());
                row.createCell(3).setCellValue(aud.getAccion());
                row.createCell(4).setCellValue(aud.getModulo());
                row.createCell(5).setCellValue(aud.getDescripcion());
                row.createCell(6).setCellValue(aud.getFecha().format(formatter));
                row.createCell(7).setCellValue(aud.getIp());
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return new ByteArrayInputStream(out.toByteArray());
        }
    }

    public ByteArrayInputStream exportToPdf(List<Auditoria> data) {
        Document document = new Document(PageSize.A4.rotate());
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Title
            Font fontHeader = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, java.awt.Color.DARK_GRAY);
            Paragraph para = new Paragraph("Bitácora de Auditoría del Sistema", fontHeader);
            para.setAlignment(Element.ALIGN_CENTER);
            para.setSpacingAfter(20);
            document.add(para);

            // Table
            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1, 2, 2, 2, 2, 4, 3, 2});

            // Table Header
            String[] headers = {"ID", "Usuario", "Rol", "Acción", "Módulo", "Descripción", "Fecha", "IP"};
            Font fontTableHead = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, java.awt.Color.WHITE);
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(header, fontTableHead));
                cell.setBackgroundColor(java.awt.Color.GRAY);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(5);
                table.addCell(cell);
            }

            // Table Body
            Font fontTableBody = FontFactory.getFont(FontFactory.HELVETICA, 9);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            for (Auditoria aud : data) {
                table.addCell(new Phrase(String.valueOf(aud.getId()), fontTableBody));
                table.addCell(new Phrase(aud.getUsername(), fontTableBody));
                table.addCell(new Phrase(aud.getRolUsuario(), fontTableBody));
                table.addCell(new Phrase(aud.getAccion(), fontTableBody));
                table.addCell(new Phrase(aud.getModulo(), fontTableBody));
                table.addCell(new Phrase(aud.getDescripcion(), fontTableBody));
                table.addCell(new Phrase(aud.getFecha().format(formatter), fontTableBody));
                table.addCell(new Phrase(aud.getIp(), fontTableBody));
            }

            document.add(table);
            document.close();

        } catch (DocumentException e) {
            e.printStackTrace();
        }

        return new ByteArrayInputStream(out.toByteArray());
    }
}
