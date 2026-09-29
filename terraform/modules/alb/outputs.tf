output "alb_arn" {
  description = "ARN of the ALB"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "DNS name of the ALB"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB"
  value       = aws_lb.main.zone_id
}

output "alb_security_group_id" {
  description = "Security group ID of ALB"
  value       = aws_security_group.alb.id
}

output "http_listener_arn" {
  description = "ARN of HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of HTTPS listener (if created)"
  value       = var.certificate_arn != "" ? aws_lb_listener.https[0].arn : ""
}

output "ai_service_target_group_arn" {
  description = "ARN of AI service target group"
  value       = aws_lb_target_group.ai_service.arn
}

output "auth_service_target_group_arn" {
  description = "ARN of Auth service target group"
  value       = aws_lb_target_group.auth_service.arn
}

output "api_service_target_group_arn" {
  description = "ARN of API service target group"
  value       = aws_lb_target_group.api_service.arn
}
