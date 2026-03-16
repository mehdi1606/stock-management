package com.stock.apigateway.config;

import com.stock.apigateway.filter.JwtAuthenticationFilter;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.server.reactive.ServerHttpRequest;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;

@Configuration

public class GatewayConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${services.auth-service.url}")
    private String authServiceUrl;

    @Value("${services.product-service.url}")
    private String productServiceUrl;

    @Value("${services.inventory-service.url}")
    private String inventoryServiceUrl;

    @Value("${services.movement-service.url}")
    private String movementServiceUrl;

    @Value("${services.location-service.url}")
    private String locationServiceUrl;

    @Value("${services.quality-service.url}")
    private String qualityServiceUrl;

    @Value("${services.alert-service.url}")
    private String alertServiceUrl;

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Auth Service - NO JWT FILTER (public endpoints)
                .route("auth-service-public", r -> r
                        .path("/api/auth/**")
                        .uri(authServiceUrl))

                // Auth Service - JWT REQUIRED (user management endpoints)
                .route("auth-service-users", r -> r
                        .path("/api/users/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter.apply(new JwtAuthenticationFilter.Config())))
                        .uri(authServiceUrl))

                // Auth Service - JWT REQUIRED (audit log endpoints)
                .route("auth-service-audit", r -> r
                        .path("/api/audit/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter.apply(new JwtAuthenticationFilter.Config())))
                        .uri(authServiceUrl))

                // Product Service - JWT only
                .route("product-service", r -> r
                        .path("/api/item-variants/**", "/api/categories/**", "/api/items/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter.apply(new JwtAuthenticationFilter.Config())))
                        .uri(productServiceUrl))

                // Inventory Service - JWT only
                .route("inventory-service", r -> r
                        .path("/api/inventory/**", "/api/lots/**", "/api/serials/**", "/api/v1/admin/cache/items/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter.apply(new JwtAuthenticationFilter.Config())))
                        .uri(inventoryServiceUrl))

                // ✅ Movement Service - JWT + X-User-Id header
                .route("movement-service", r -> r
                        .path("/api/movement-tasks/**", "/api/movement-lines/**", "/api/movements/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter.apply(new JwtAuthenticationFilter.Config()))
                                // ✅ Ajouter le filter pour extraire userId
                                .filter((exchange, chain) -> {
                                    try {
                                        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
                                        if (authHeader != null && authHeader.startsWith("Bearer ")) {
                                            String jwt = authHeader.substring(7);
                                            
                                            // Extraire l'userId du JWT
                                            Claims claims = Jwts.parser()
                                                    .verifyWith(getPublicKey())
                                                    .build()
                                                    .parseSignedClaims(jwt)
                                                    .getPayload();
                                            
                                            // Adapter selon le nom du claim dans votre JWT
                                            String userId = claims.get("userId", String.class); // ou "sub" ou "user_id"
                                            
                                            if (userId != null) {
                                                ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                                                        .header("X-User-Id", userId)
                                                        .build();
                                                return chain.filter(exchange.mutate().request(modifiedRequest).build());
                                            }
                                        }
                                    } catch (Exception e) {
                                        // Continue sans le header si erreur
                                    }
                                    return chain.filter(exchange);
                                }))
                        .uri(movementServiceUrl))

                // Location Service - JWT only
                .route("location-service", r -> r
                        .path("/api/locations/**", "/api/sites/**", "/api/warehouses/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter.apply(new JwtAuthenticationFilter.Config())))
                        .uri(locationServiceUrl))

                // Quality Service - JWT only
                .route("quality-service", r -> r
                        .path("/api/quality/**", "/api/quality/controls/**", "/api/quality/attachments/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter.apply(new JwtAuthenticationFilter.Config())))
                        .uri(qualityServiceUrl))

                // Alert Service - JWT only
                .route("alert-service", r -> r
                        .path("/api/alerts/**", "/api/notifications/**", "/api/notification-channels/**", "/api/notification-templates/**", "/api/rules/**")
                        .filters(f -> f
                                .filter(jwtAuthenticationFilter.apply(new JwtAuthenticationFilter.Config())))
                        .uri(alertServiceUrl))

                .build();
    }
    
    // ✅ Méthode helper pour obtenir la clé publique
    private PublicKey getPublicKey() throws Exception {
        String n = "zzxT2R2l-vnLM4Tmcj8yyukMh7bML0V_82tsB39BKomsoPsrCm05xXppVwyIUuBnS-5tmHAUD_Vc0cDocCRzX_eZ8dWMq5SXAUJRdxVBndFTtK4VC1Hou5JtwrqHFkThtsEBxbGe6zBr-BMsfHnaVQNZa75SWN5xbhTuUnXDF5k36bVwM51mlzoMVDWN6kTFvZ1YibZTORSny3ExwlZvse_vf9-ZsRhDoZYDSOtHHnWK_WQqcmiid2DHdbzDYPGggVLuRQTtvTGmd5K18eGU7zYOiNeeWX45uTS9s6_ozGQnbWYGD4gsaKueWcvL_K1swaCEkyPscFsTf6wfAKFWSQ";
        String e = "AQAB";

        byte[] nBytes = Base64.getUrlDecoder().decode(n);
        byte[] eBytes = Base64.getUrlDecoder().decode(e);

        BigInteger modulus = new BigInteger(1, nBytes);
        BigInteger exponent = new BigInteger(1, eBytes);

        RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, exponent);
        KeyFactory factory = KeyFactory.getInstance("RSA");

        return factory.generatePublic(spec);
    }
}
