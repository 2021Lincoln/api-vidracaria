from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from app.models import Order, Quote


def _new_canvas() -> tuple[BytesIO, canvas.Canvas]:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    return buffer, pdf


def build_quote_pdf(quote: Quote) -> bytes:
    buffer, pdf = _new_canvas()
    y = 800

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "AFQA Vidracaria - Orcamento")
    y -= 24

    pdf.setFont("Helvetica", 11)
    pdf.drawString(40, y, f"Orcamento #{quote.id}")
    y -= 16
    pdf.drawString(40, y, f"Cliente ID: {quote.client_id}")
    y -= 16
    pdf.drawString(40, y, f"Status: {quote.status}")
    y -= 16
    pdf.drawString(40, y, f"Descricao: {quote.description[:100]}")
    y -= 16
    pdf.drawString(40, y, f"Medicao: {quote.measurement_date or '-'}")
    y -= 16
    pdf.drawString(40, y, f"Validade: {quote.validity_date or '-'}")
    y -= 24

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(40, y, "Itens")
    y -= 16
    pdf.setFont("Helvetica", 10)

    for item in quote.items:
        line = (
            f"- {item.description} | {item.quantity:.2f} {item.unit} x "
            f"R$ {item.unit_price:.2f} = R$ {item.line_total:.2f}"
        )
        pdf.drawString(40, y, line[:110])
        y -= 14
        if y < 80:
            pdf.showPage()
            y = 800
            pdf.setFont("Helvetica", 10)

    y -= 12
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(40, y, f"Desconto: R$ {quote.discount:.2f}")
    y -= 18
    pdf.drawString(40, y, f"Total: R$ {quote.total:.2f}")

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.read()


def build_order_pdf(order: Order) -> bytes:
    buffer, pdf = _new_canvas()
    y = 800

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, "AFQA Vidracaria - Pedido")
    y -= 24

    pdf.setFont("Helvetica", 11)
    pdf.drawString(40, y, f"Pedido #{order.id}")
    y -= 16
    pdf.drawString(40, y, f"Orcamento ID: {order.quote_id}")
    y -= 16
    pdf.drawString(40, y, f"Status: {order.status}")
    y -= 16
    pdf.drawString(40, y, f"Instalacao agendada: {order.scheduled_installation or '-'}")
    y -= 16
    pdf.drawString(40, y, f"Instalado em: {order.installed_at or '-'}")
    y -= 16
    pdf.drawString(40, y, f"Total: R$ {order.total:.2f}")
    y -= 24

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(40, y, "Pagamentos")
    y -= 16
    pdf.setFont("Helvetica", 10)

    if not order.payments:
        pdf.drawString(40, y, "- Sem pagamentos registrados")
    else:
        for payment in order.payments:
            line = (
                f"- R$ {payment.amount:.2f} | {payment.method} | "
                f"{payment.status} | {payment.paid_at or '-'}"
            )
            pdf.drawString(40, y, line[:110])
            y -= 14
            if y < 80:
                pdf.showPage()
                y = 800
                pdf.setFont("Helvetica", 10)

    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return buffer.read()
